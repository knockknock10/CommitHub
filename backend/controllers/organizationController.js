import mongoose from "mongoose";
import Organization from "../models/organizationModel.js";
import OrganizationMembership from "../models/organizationMembershipModel.js";
import User from "../models/userModel.js";
import { isOrganizationMember } from "../utils/orgAccess.js";

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
};

export const createOrganization = async (req, res) => {
    try {
        const { name, description, visibility } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({
                message: "Organization name is required"
            });
        }

        const slug = generateSlug(name.trim());

        if (!slug) {
            return res.status(400).json({
                message: "Invalid organization name"
            });
        }

        const existingOrg = await Organization.findOne({ slug });

        if (existingOrg) {
            return res.status(409).json({
                message: "Organization with this name already exists"
            });
        }

        const organization = await Organization.create({
            name: name.trim(),
            slug,
            description: description || "",
            visibility: visibility || "public",
            owner: req.user._id
        });

        await OrganizationMembership.create({
            organization: organization._id,
            user: req.user._id,
            role: "OWNER"
        });

        return res.status(201).json(organization);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Organization with this name already exists"
            });
        }
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getOrganization = async (req, res) => {
    try {
        const { slug } = req.params;

        const organization = await Organization.findOne({ slug })
            .populate("owner", "userName email");

        if (!organization) {
            return res.status(404).json({
                message: "Organization not found"
            });
        }

        if (organization.visibility !== "public" && !await isOrganizationMember(req.user._id, organization._id)) {
            return res.status(403).json({
                message: "You do not have access to this organization"
            });
        }

        return res.status(200).json(organization);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getOrganizationMembers = async (req, res) => {
    try {
        const { slug } = req.params;

        const organization = await Organization.findOne({ slug });

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

        const members = await OrganizationMembership.find({
            organization: organization._id
        })
            .populate("user", "userName email")
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json(members);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const addOrganizationMember = async (req, res) => {
    try {
        const { slug } = req.params;
        const { userName, role } = req.body;
        let userId = req.body.userId;

        const organization = await Organization.findOne({ slug });

        if (!organization) {
            return res.status(404).json({
                message: "Organization not found"
            });
        }

        const callerMembership = await OrganizationMembership.findOne({
            organization: organization._id,
            user: req.user._id
        });

        if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
            return res.status(403).json({
                message: "Only organization owners and admins can add members"
            });
        }

        if (userId) {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    message: "Valid user ID is required"
                });
            }
        } else if (userName) {
            const user = await User.findOne({ userName: userName.trim() });
            if (!user) {
                return res.status(404).json({
                    message: `No user found with username "${userName.trim()}"`
                });
            }
            userId = user._id;
        } else {
            return res.status(400).json({
                message: "A userId or userName is required"
            });
        }

        const allowedRoles = ["MEMBER", "ADMIN"];

        if (!role || !allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Role must be one of: ${allowedRoles.join(", ")}`
            });
        }

        const existingMembership = await OrganizationMembership.findOne({
            organization: organization._id,
            user: userId
        });

        if (existingMembership) {
            return res.status(409).json({
                message: "User is already a member of this organization"
            });
        }

        const membership = await OrganizationMembership.create({
            organization: organization._id,
            user: userId,
            role
        });

        return res.status(201).json(membership);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "User is already a member of this organization"
            });
        }
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const removeOrganizationMember = async (req, res) => {
    try {
        const { slug, userId } = req.params;

        const organization = await Organization.findOne({ slug });

        if (!organization) {
            return res.status(404).json({
                message: "Organization not found"
            });
        }

        const callerMembership = await OrganizationMembership.findOne({
            organization: organization._id,
            user: req.user._id
        });

        if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
            return res.status(403).json({
                message: "Only organization owners and admins can remove members"
            });
        }

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "Valid user ID is required"
            });
        }

        if (userId === organization.owner.toString()) {
            return res.status(400).json({
                message: "Cannot remove the organization owner"
            });
        }

        const membership = await OrganizationMembership.findOneAndDelete({
            organization: organization._id,
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