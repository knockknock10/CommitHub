import Repository from "../models/repoModel.js";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import OrganizationMembership from "../models/organizationMembershipModel.js";
import { getUserRepositoryRole } from "../services/permissionService.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 100;

const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const globalSearch = async (req, res) => {
    try {
        const { q, type = "all", page = 1, limit = DEFAULT_LIMIT } = req.query;

        if (!q || typeof q !== "string" || q.trim().length < 3) {
            return res.status(400).json({
                message: "Search query must be at least 3 characters long"
            });
        }

        if (q.length > MAX_QUERY_LENGTH) {
            return res.status(400).json({
                message: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer`
            });
        }

        const allowedTypes = [
            "all",
            "users",
            "organizations",
            "repositories"
        ];

        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                message: "Invalid search type"
            });
        }

        const queryStr = escapeRegex(q.trim());

        const parsedLimit = parseInt(limit, 10);
        const parsedPage = parseInt(page, 10);

        const sanitizedLimit = Math.min(
            Math.max(parsedLimit || DEFAULT_LIMIT, 1),
            MAX_LIMIT
        );

        const sanitizedPage = Math.max(parsedPage || 1, 1);

        const skip = (sanitizedPage - 1) * sanitizedLimit;

        const results = {
            repositories: [],
            users: [],
            organizations: [],
            total: 0
        };

        /*
         * 1. Search Users
         */
        if (type === "all" || type === "users") {
            const users = await User.find({
                $or: [
                    {
                        userName: {
                            $regex: queryStr,
                            $options: "i"
                        }
                    }
                ]
            })
                .select("userName")
                .skip(skip)
                .limit(sanitizedLimit)
                .lean();

            results.users = users.map((user) => ({
                id: user._id,
                userName: user.userName,
                type: "user"
            }));
        }

        /*
         * 2. Search Organizations
         */
        if (type === "all" || type === "organizations") {
            const orgMemberships = await OrganizationMembership.find({ user: req.user._id }).select("organization").lean();
            const userOrgIds = orgMemberships.map(m => m.organization);

            const organizations = await Organization.find({
                $or: [
                    {
                        name: {
                            $regex: queryStr,
                            $options: "i"
                        }
                    },
                    {
                        slug: {
                            $regex: queryStr,
                            $options: "i"
                        }
                    }
                ],
                _id: { $in: userOrgIds }
            })
                .select("name slug avatar description")
                .skip(skip)
                .limit(sanitizedLimit)
                .lean();

            results.organizations = organizations.map((organization) => ({
                id: organization._id,
                name: organization.name,
                slug: organization.slug,
                avatar: organization.avatar,
                description: organization.description,
                type: "organization"
            }));
        }

        /*
         * 3. Search Repositories
         *
         * Public repositories are searchable by everyone.
         * Private repositories are only returned when the
         * authenticated user has access.
         */
        if (type === "all" || type === "repositories") {
            const repos = await Repository.find({
                $or: [
                    {
                        name: {
                            $regex: queryStr,
                            $options: "i"
                        }
                    },
                    {
                        description: {
                            $regex: queryStr,
                            $options: "i"
                        }
                    }
                ]
            })
                .select(
                    "name description visibility owner organization stars forks"
                )
                .skip(skip)
                .limit(sanitizedLimit)
                .lean();

            const authorizedRepos = [];

            for (const repo of repos) {
                if (repo.visibility === "public") {
                    authorizedRepos.push(repo);
                    continue;
                }

                const role = await getUserRepositoryRole(
                    req.user._id,
                    repo._id
                );

                if (role) {
                    authorizedRepos.push(repo);
                }
            }

            results.repositories = authorizedRepos.map((repo) => ({
                id: repo._id,
                name: repo.name,
                description: repo.description,
                visibility: repo.visibility,
                owner: repo.owner,
                organization: repo.organization,
                stars: repo.stars,
                forks: repo.forks,
                type: "repository"
            }));
        }

        results.total =
            results.repositories.length +
            results.users.length +
            results.organizations.length;

        return res.status(200).json({
            repositories: results.repositories,
            users: results.users,
            organizations: results.organizations,
            total: results.total,
            page: sanitizedPage,
            limit: sanitizedLimit
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error during search"
        });
    }
};