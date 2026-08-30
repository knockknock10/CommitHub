import Collaborator, { COLLABORATOR_ROLES } from "../models/collaboratorModel.js";

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
    const collaborator = await Collaborator.findOne({ repository: repositoryId, user: userId }).lean();
    return collaborator ? collaborator.role : null;
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
