import mongoose from "mongoose";
import Repository from "../models/repoModel.js";
import { getUserRepositoryRole, roleHasPermission, PERMISSIONS } from "../services/permissionService.js";
import OrganizationMembership from "../models/organizationMembershipModel.js";

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
        (repository.owner && repository.owner.toString() === req.user._id.toString()) ||
        (repository.organization && await isOrgAdmin(repository.organization, req.user._id));

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

async function isOrgAdmin(orgId, userId) {
    const membership = await OrganizationMembership.findOne({ organization: orgId, user: userId });
    return membership && ["OWNER", "ADMIN"].includes(membership.role);
}

/* pure read-access check, no response side effects — used to decide
   whether a viewer of a cross-repository pull request may see the source
   repository's comparison details */
export const canReadRepository = async (userId, repository) => {
    if (!repository) {
        return false;
    }

    if (repository.visibility === "public") {
        return true;
    }

    const isOwner = 
        (repository.owner && repository.owner.toString() === userId.toString()) ||
        (repository.organization && await isOrgAdmin(repository.organization, userId));

    if (isOwner) {
        return true;
    }

    const role = await getUserRepositoryRole(userId, repository._id);

    return Boolean(role && roleHasPermission(role, PERMISSIONS.READ));
};

/* write-access check for a repository, mirroring the write branch of
   authorizeRepository: true for the owner (or an org admin of an
   organization-owned repo) or a collaborator/team role with PUSH. Used to
   require a real source repository (not merely a readable one) when opening
   a cross-repository pull request. */
export const canWriteRepository = async (userId, repository) => {
    if (!repository) {
        return false;
    }

    const isOwner =
        (repository.owner && repository.owner.toString() === userId.toString()) ||
        (repository.organization && await isOrgAdmin(repository.organization, userId));

    if (isOwner) {
        return true;
    }

    const role = await getUserRepositoryRole(userId, repository._id);

    return Boolean(role && roleHasPermission(role, PERMISSIONS.PUSH));
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
        (repository.owner && repository.owner.toString() === req.user._id.toString()) ||
        (repository.organization && await isOrgAdmin(repository.organization, req.user._id));

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
