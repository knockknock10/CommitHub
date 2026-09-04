import Collaborator, { COLLABORATOR_ROLES } from "../models/collaboratorModel.js";
import OrganizationMembership from "../models/organizationMembershipModel.js";
import TeamMembership from "../models/teamMembershipModel.js";
import TeamRepoPermission from "../models/teamRepoPermissionModel.js";

export const PERMISSIONS = {
    READ: "read",
    PUSH: "push",
    CREATE_PR: "create_pr",
    REVIEW_PR: "review_pr",
    MERGE_PR: "merge_pr",
    MANAGE_BRANCH_PROTECTION: "manage_branch_protection",
    MANAGE_COLLABORATORS: "manage_collaborators",
    MANAGE_SETTINGS: "manage_settings",
    DELETE: "delete"
};

const ROLE_PERMISSIONS = {
    owner: [
        PERMISSIONS.READ, PERMISSIONS.PUSH, PERMISSIONS.CREATE_PR,
        PERMISSIONS.REVIEW_PR, PERMISSIONS.MERGE_PR,
        PERMISSIONS.MANAGE_BRANCH_PROTECTION, PERMISSIONS.MANAGE_COLLABORATORS,
        PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.DELETE
    ],
    maintainer: [
        PERMISSIONS.READ, PERMISSIONS.PUSH, PERMISSIONS.CREATE_PR,
        PERMISSIONS.REVIEW_PR, PERMISSIONS.MERGE_PR,
        PERMISSIONS.MANAGE_BRANCH_PROTECTION, PERMISSIONS.MANAGE_COLLABORATORS,
        PERMISSIONS.MANAGE_SETTINGS
    ],
    developer: [
        PERMISSIONS.READ, PERMISSIONS.PUSH, PERMISSIONS.CREATE_PR,
        PERMISSIONS.REVIEW_PR, PERMISSIONS.MERGE_PR
    ],
    reporter: [
        PERMISSIONS.READ, PERMISSIONS.CREATE_PR, PERMISSIONS.REVIEW_PR
    ],
    read_only: [
        PERMISSIONS.READ
    ]
};

export const getRolePermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

export const roleHasPermission = (role, permission) => {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? permissions.includes(permission) : false;
};

export const getUserRepositoryRole = async (userId, repositoryId) => {
    // 1. Direct Collaborator Role
    const collaborator = await Collaborator.findOne({ repository: repositoryId, user: userId }).lean();
    if (collaborator) return collaborator.role;

    // 2. Team-based Role
    const teamMemberships = await TeamMembership.find({ user: userId }).lean();
    const teamRoles = await TeamRepoPermission.find({
        repository: repositoryId,
        team: { $in: teamMemberships.map(tm => tm.team) }
    }).lean();

    if (teamRoles.length > 0) {
        // Precedence: highest role wins
        const rolePriority = {
            owner: 5, maintainer: 4, developer: 3, reporter: 2, read_only: 1
        };
        return teamRoles.reduce((prev, curr) =>
            (rolePriority[curr.role] > rolePriority[prev.role]) ? curr.role : prev
        ).role;
    }

    return null;
};

export const getUserRepositoryPermissions = async (userId, repositoryId) => {
    const role = await getUserRepositoryRole(userId, repositoryId);
    return role ? getRolePermissions(role) : [];
};

export const userHasPermission = async (userId, repositoryId, permission) => {
    const role = await getUserRepositoryRole(userId, repositoryId);
    if (!role) return false;
    return roleHasPermission(role, permission);
};
