import OrganizationMembership from "../models/organizationMembershipModel.js";

export const getUserOrganizationRole = async (userId, organizationId) => {
    const membership = await OrganizationMembership.findOne({
        organization: organizationId,
        user: userId
    });

    return membership ? membership.role : null;
};

export const isOrganizationMember = async (userId, organizationId) => {
    return Boolean(await getUserOrganizationRole(userId, organizationId));
};