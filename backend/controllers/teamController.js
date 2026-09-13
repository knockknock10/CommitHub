import mongoose from "mongoose";
import Organization from "../models/organizationModel.js";
import Team from "../models/teamModel.js";
import TeamMembership from "../models/teamMembershipModel.js";
import { getUserOrganizationRole, isOrganizationMember } from "../utils/orgAccess.js";

const requireOrgAdmin = async (organizationId, userId) => {
    const role = await getUserOrganizationRole(userId, organizationId);
    return role && ["OWNER", "ADMIN"].includes(role);
};

export const getTeams = async (req, res) => {
    try {
        const { orgSlug } = req.params;

        const organization = await Organization.findOne({ slug: orgSlug });

        if (!organization) {
            return res.status(404).json({
                message: "Organization not found"
            });
        }

        if (!await isOrganizationMember(req.user._id, organization._id)) {
            return res.status(403).json({
                message: "You do not have access to this organization"
            });
        }

        const teams = await Team.find({
            organization: organization._id
        })
            .populate("createdBy", "userName email")
            .sort({ createdAt: -1 })
            .lean();

        const memberships = await TeamMembership.aggregate([
            { $match: { team: { $in: teams.map(t => t._id) } } },
            { $group: { _id: "$team", count: { $sum: 1 } } }
        ]);
        const countByTeam = Object.fromEntries(
            memberships.map(m => [String(m._id), m.count])
        );
        const teamsWithCounts = teams.map(team => ({
            ...team,
            memberCount: countByTeam[String(team._id)] || 0
        }));

        return res.status(200).json(teamsWithCounts);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const createTeam = async (req, res) => {
    try {
        const { organizationId, name, description } = req.body;

        if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                message: "Valid organization ID is required"
            });
        }

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({
                message: "Team name is required"
            });
        }

        const organization = await Organization.findById(organizationId);

        if (!organization) {
            return res.status(404).json({
                message: "Organization not found"
            });
        }

        if (!await requireOrgAdmin(organizationId, req.user._id)) {
            return res.status(403).json({
                message: "Only organization owners and admins can create teams"
            });
        }

        const team = await Team.create({
            name: name.trim(),
            organization: organizationId,
            description: description || "",
            createdBy: req.user._id
        });

        return res.status(201).json(team);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Team with this name already exists in this organization"
            });
        }
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const addTeamMember = async (req, res) => {
    try {
        const { teamId, userId, role } = req.body;

        if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
            return res.status(400).json({
                message: "Valid team ID is required"
            });
        }

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "Valid user ID is required"
            });
        }

        const team = await Team.findById(teamId);

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (!await requireOrgAdmin(team.organization, req.user._id)) {
            return res.status(403).json({
                message: "Only organization owners and admins can manage team members"
            });
        }

        const allowedRoles = ["maintainer", "member"];

        if (role && !allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Role must be one of: ${allowedRoles.join(", ")}`
            });
        }

        const existing = await TeamMembership.findOne({
            team: teamId,
            user: userId
        });

        if (existing) {
            return res.status(409).json({
                message: "User is already a member of this team"
            });
        }

        const membership = await TeamMembership.create({
            team: teamId,
            user: userId,
            role: role || "member"
        });

        return res.status(201).json(membership);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "User is already a member of this team"
            });
        }
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const removeTeamMember = async (req, res) => {
    try {
        const { teamId, userId } = req.body;

        if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
            return res.status(400).json({
                message: "Valid team ID is required"
            });
        }

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "Valid user ID is required"
            });
        }

        const team = await Team.findById(teamId);

        if (!team) {
            return res.status(404).json({
                message: "Team not found"
            });
        }

        if (!await requireOrgAdmin(team.organization, req.user._id)) {
            return res.status(403).json({
                message: "Only organization owners and admins can manage team members"
            });
        }

        const membership = await TeamMembership.findOneAndDelete({
            team: teamId,
            user: userId
        });

        if (!membership) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        return res.status(200).json({
            message: "Member removed"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};