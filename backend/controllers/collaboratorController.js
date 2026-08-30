import mongoose from "mongoose";
import Collaborator, { COLLABORATOR_ROLES } from "../models/collaboratorModel.js";
import User from "../models/userModel.js";
import { authorizeRepository, authorizeRepositoryPermission } from "../utils/repoAccess.js";
import { PERMISSIONS, getRolePermissions } from "../utils/permissionService.js";
import { createNotification } from "../utils/notificationService.js";
import { createActivity } from "../utils/activityService.js";
import { emitDomainEvent } from "../utils/domainEvents.js";
import { RT_EVENT } from "../realtime/eventTypes.js";

export const getCollaborators = async (req, res) => {
    try {
        const auth = await authorizeRepository(req, res, false);

        if (!auth) return;

        const collaborators = await Collaborator.find({ repository: auth.repository._id })
            .populate("user", "userName email")
            .populate("invitedBy", "userName")
            .sort({ createdAt: 1 })
            .lean();

        return res.status(200).json(collaborators);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const addCollaborator = async (req, res) => {
    try {
        const auth = await authorizeRepositoryPermission(req, res, PERMISSIONS.MANAGE_COLLABORATORS);

        if (!auth) return;

        const { userId, role } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "Valid user ID is required"
            });
        }

        if (!role || !COLLABORATOR_ROLES.includes(role)) {
            return res.status(400).json({
                message: `Role must be one of: ${COLLABORATOR_ROLES.join(", ")}`
            });
        }

        if (role === "owner") {
            return res.status(400).json({
                message: "Cannot assign owner role through this endpoint"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (userId.toString() === auth.repository.owner.toString()) {
            return res.status(400).json({
                message: "Repository owner is already the owner"
            });
        }

        const existing = await Collaborator.findOne({
            repository: auth.repository._id,
            user: userId
        });

        if (existing) {
            return res.status(409).json({
                message: "User is already a collaborator"
            });
        }

        const collaborator = await Collaborator.create({
            repository: auth.repository._id,
            user: userId,
            role,
            invitedBy: req.user._id
        });

        const populated = await Collaborator.findById(collaborator._id)
            .populate("user", "userName email")
            .populate("invitedBy", "userName");

        createNotification({
            recipient: userId,
            actor: req.user._id,
            type: "PR_CREATED",
            repository: auth.repository._id,
            message: `You were added as a collaborator (${role}) on ${auth.repository.name}`
        }).catch(() => {});

        createActivity({
            actor: req.user._id,
            type: "ISSUE_CREATED",
            repository: auth.repository._id,
            metadata: {
                action: "collaborator_added",
                targetUser: userId,
                role
            }
        }).catch(() => {});

        emitDomainEvent(RT_EVENT.COLLABORATOR_ADDED, {
            repository: auth.repository._id.toString(),
            collaborator: {
                _id: populated._id,
                user: populated.user,
                role: populated.role,
                invitedBy: populated.invitedBy,
                createdAt: populated.createdAt
            }
        });

        return res.status(201).json(populated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "User is already a collaborator"
            });
        }
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const updateCollaborator = async (req, res) => {
    try {
        const auth = await authorizeRepositoryPermission(req, res, PERMISSIONS.MANAGE_COLLABORATORS);

        if (!auth) return;

        const { userId } = req.params;
        const { role } = req.body;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "Valid user ID is required"
            });
        }

        if (!role || !COLLABORATOR_ROLES.includes(role)) {
            return res.status(400).json({
                message: `Role must be one of: ${COLLABORATOR_ROLES.join(", ")}`
            });
        }

        if (role === "owner") {
            return res.status(400).json({
                message: "Cannot assign owner role through this endpoint"
            });
        }

        if (userId.toString() === auth.repository.owner.toString()) {
            return res.status(400).json({
                message: "Cannot modify the repository owner's role"
            });
        }

        const collaborator = await Collaborator.findOne({
            repository: auth.repository._id,
            user: userId
        });

        if (!collaborator) {
            return res.status(404).json({
                message: "Collaborator not found"
            });
        }

        collaborator.role = role;
        await collaborator.save();

        const populated = await Collaborator.findById(collaborator._id)
            .populate("user", "userName email")
            .populate("invitedBy", "userName");

        emitDomainEvent(RT_EVENT.COLLABORATOR_UPDATED, {
            repository: auth.repository._id.toString(),
            collaborator: {
                _id: populated._id,
                user: populated.user,
                role: populated.role,
                invitedBy: populated.invitedBy,
                createdAt: populated.createdAt
            }
        });

        return res.status(200).json(populated);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const removeCollaborator = async (req, res) => {
    try {
        const auth = await authorizeRepositoryPermission(req, res, PERMISSIONS.MANAGE_COLLABORATORS);

        if (!auth) return;

        const { userId } = req.params;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "Valid user ID is required"
            });
        }

        if (userId.toString() === auth.repository.owner.toString()) {
            return res.status(400).json({
                message: "Cannot remove the repository owner"
            });
        }

        const collaborator = await Collaborator.findOneAndDelete({
            repository: auth.repository._id,
            user: userId
        });

        if (!collaborator) {
            return res.status(404).json({
                message: "Collaborator not found"
            });
        }

        const populated = await Collaborator.findById(collaborator._id)
            .populate("user", "userName email")
            .populate("invitedBy", "userName");

        emitDomainEvent(RT_EVENT.COLLABORATOR_REMOVED, {
            repository: auth.repository._id.toString(),
            collaborator: {
                _id: populated._id,
                user: populated.user,
                role: populated.role,
                invitedBy: populated.invitedBy,
                createdAt: populated.createdAt
            }
        });

        return res.status(200).json({
            message: "Collaborator removed"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getMyCollaboratorRole = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner = repository.owner.toString() === req.user._id.toString();

        if (isOwner) {
            return res.status(200).json({ role: "owner" });
        }

        const collaborator = await Collaborator.findOne({
            repository: id,
            user: req.user._id
        }).lean();

        if (!collaborator) {
            return res.status(200).json({ role: null });
        }

        return res.status(200).json({
            role: collaborator.role,
            permissions: getRolePermissions(collaborator.role)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
