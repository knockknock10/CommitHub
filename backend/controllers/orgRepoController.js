import Organization from "../models/organizationModel.js";
import OrganizationMembership from "../models/organizationMembershipModel.js";
import Repository from "../models/repoModel.js";

export const getOrgRepositories = async (req, res) => {
    try {
        const { orgSlug } = req.params;

        const organization = await Organization.findOne({ slug: orgSlug });

        if (!organization) {
            return res.status(404).json({
                message: "Organization not found"
            });
        }

        const isMember = await OrganizationMembership.exists({
            organization: organization._id,
            user: req.user._id
        });

        const query = { organization: organization._id };

        if (!isMember) {
            query.visibility = "public";
        }

        const repositories = await Repository.find(query)
            .populate("owner", "userName email")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json(repositories);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
