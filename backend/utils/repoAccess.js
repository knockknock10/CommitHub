import mongoose from "mongoose";
import Repository from "../models/repoModel.js";
import { getUserRepositoryRole, roleHasPermission, PERMISSIONS } from "./permissionService.js";

/* shared validate → load → authorize prelude */

export const authorizeRepository = async (req, res, writeOperation) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
            message: "Invalid repository ID"
        });
        return null;
    }

    const repository = await Repository.findById(id);

    if (!repository) {
        res.status(404).json({
            message: "Repository not found"
        });
        return null;
    }

    const isOwner =
        repository.owner.toString() === req.user._id.toString();

    if (writeOperation) {
        if (isOwner) {
            return { repository, isOwner, userRole: "owner" };
        }
        const role = await getUserRepositoryRole(req.user._id, repository._id);
        if (role && roleHasPermission(role, PERMISSIONS.PUSH)) {
            return { repository, isOwner: false, userRole: role };
        }
        res.status(403).json({
            message: "You do not have access to this repository"
        });
        return null;
    }

    if (repository.visibility === "public" || isOwner) {
        if (isOwner) {
            return { repository, isOwner, userRole: "owner" };
        }
        const role = await getUserRepositoryRole(req.user._id, repository._id);
        return { repository, isOwner: false, userRole: role || null };
    }

    const role = await getUserRepositoryRole(req.user._id, repository._id);
    if (role && roleHasPermission(role, PERMISSIONS.READ)) {
        return { repository, isOwner: false, userRole: role };
    }

    res.status(403).json({
        message: "You do not have access to this repository"
    });
    return null;
};

export const authorizeRepositoryPermission = async (req, res, permission) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
            message: "Invalid repository ID"
        });
        return null;
    }

    const repository = await Repository.findById(id);

    if (!repository) {
        res.status(404).json({
            message: "Repository not found"
        });
        return null;
    }

    const isOwner =
        repository.owner.toString() === req.user._id.toString();

    if (isOwner) {
        return { repository, isOwner, userRole: "owner" };
    }

    const role = await getUserRepositoryRole(req.user._id, repository._id);
    if (role && roleHasPermission(role, permission)) {
        return { repository, isOwner: false, userRole: role };
    }

    res.status(403).json({
        message: "You do not have sufficient permissions for this repository"
    });
    return null;
};
