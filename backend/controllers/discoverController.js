import Repository from "../models/repoModel.js";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import OrganizationMembership from "../models/organizationMembershipModel.js";

/* Platform discovery feed for the Home page.
   Only public data is ever returned: public repositories, public
   organizations, and users (public profile fields only). Private
   repository/organization content is intentionally never queried. */

const LIMITS = {
    repositories: 8,
    users: 8,
    organizations: 8
};

/* Organizations are returned as a public listing with real member counts
   derived from the membership collection (no invented metadata). */
const getOrganizationList = async () => {
    const organizations = await Organization.find({
        visibility: "public"
    })
        .select("name slug description avatar createdAt")
        .sort({ createdAt: -1 })
        .limit(LIMITS.organizations)
        .lean();

    if (organizations.length === 0) {
        return [];
    }

    const memberCounts = await OrganizationMembership.aggregate([
        {
            $match: {
                organization: {
                    $in: organizations.map((org) => org._id)
                }
            }
        },
        {
            $group: {
                _id: "$organization",
                count: { $sum: 1 }
            }
        }
    ]);

    const countById = new Map(
        memberCounts.map((entry) => [String(entry._id), entry.count])
    );

    return organizations.map((org) => ({
        _id: org._id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        avatar: org.avatar,
        memberCount: countById.get(String(org._id)) || 0
    }));
};

const mapRepository = (repo) => ({
    _id: repo._id,
    name: repo.name,
    description: repo.description,
    visibility: repo.visibility,
    stars: repo.stars,
    forks: repo.forks,
    owner: repo.owner ? {
        _id: repo.owner._id,
        userName: repo.owner.userName
    } : null
});

const mapUser = (user) => ({
    _id: user._id,
    userName: user.userName,
    name: user.name,
    bio: user.bio,
    createdAt: user.createdAt
});

const getRecentRepositories = () =>
    Repository.find({ visibility: "public" })
        .select("name description visibility stars forks owner createdAt")
        .populate("owner", "userName")
        .sort({ createdAt: -1, _id: -1 })
        .limit(LIMITS.repositories)
        .lean();

const getTrendingRepositories = () =>
    Repository.find({ visibility: "public" })
        .select("name description visibility stars forks owner createdAt")
        .populate("owner", "userName")
        .sort({ stars: -1, createdAt: -1 })
        .limit(LIMITS.repositories)
        .lean();

const getNewUsers = () =>
    User.find()
        .select("userName name bio createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .limit(LIMITS.users)
        .lean();

export const getDiscover = async (req, res) => {
    try {
        const [recentRepositories, trendingRepositories, newUsers, organizations] =
            await Promise.all([
                getRecentRepositories(),
                getTrendingRepositories(),
                getNewUsers(),
                getOrganizationList()
            ]);

        return res.status(200).json({
            recentRepositories: recentRepositories.map(mapRepository),
            trendingRepositories: trendingRepositories.map(mapRepository),
            newUsers: newUsers.map(mapUser),
            organizations
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};