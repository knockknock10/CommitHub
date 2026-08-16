import Activity, {
    ACTIVITY_TYPES
} from "../models/activityModel.js";
import Repository from "../models/repoModel.js";
import { authorizeRepository } from "../utils/repoAccess.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
};

/* repositories the authenticated user may see activity for.
   Repository read access in CommitHub is exactly: owned OR public.
   Starring, following, or participating in a repository never grants
   access to it, so those relationships are deliberately NOT used as feed
   visibility criteria — otherwise a repository that was made private after
   being starred/participated in would leak its activity. */
const getVisibleRepositoryIds = async (userId) => {
    const [owned, publicRepos] = await Promise.all([
        Repository.find({ owner: userId }).select("_id"),
        Repository.find({ visibility: "public" }).select("_id")
    ]);

    const ids = new Set();

    for (const repository of owned) {
        ids.add(repository._id.toString());
    }

    for (const repository of publicRepos) {
        ids.add(repository._id.toString());
    }

    return Array.from(ids);
};

const buildActivityQuery = (baseQuery, rawType) => {
    if (rawType) {
        const types = rawType
            .split(",")
            .map((type) => type.trim())
            .filter(Boolean);

        if (
            types.length === 0 ||
            types.some((type) => !ACTIVITY_TYPES.includes(type))
        ) {
            return { error: "Invalid activity type" };
        }

        baseQuery.type = types.length === 1 ? types[0] : { $in: types };
    }

    return { query: baseQuery };
};

const runActivityQuery = async (query, page, limit) => {
    const [activities, total] = await Promise.all([
        Activity.find(query)
            .populate("actor", "userName email")
            .populate("repository", "name visibility")
            .populate("issue", "title")
            .populate("pullRequest", "number title")
            .populate("release", "title tagName")
            .populate("tag", "name")
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Activity.countDocuments(query)
    ]);

    return { activities, total };
};

/* user activity feed: every repository the user is authorized to see */
export const getGlobalActivity = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(
            parsePositiveInt(req.query.limit, DEFAULT_LIMIT),
            MAX_LIMIT
        );

        const parsed = buildActivityQuery({}, req.query.type);

        if (parsed.error) {
            return res.status(400).json({
                message: parsed.error
            });
        }

        const visibleIds = await getVisibleRepositoryIds(req.user._id);

        if (visibleIds.length === 0) {
            return res.status(200).json({
                activities: [],
                total: 0,
                page,
                limit,
                pages: 0
            });
        }

        parsed.query.repository = { $in: visibleIds };

        const { activities, total } = await runActivityQuery(
            parsed.query,
            page,
            limit
        );

        return res.status(200).json({
            activities,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* repository activity feed: access is verified before any activity is
   returned, so private repository activity is never exposed. */
export const getRepositoryActivity = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(
            parsePositiveInt(req.query.limit, DEFAULT_LIMIT),
            MAX_LIMIT
        );

        const parsed = buildActivityQuery(
            { repository: result.repository._id },
            req.query.type
        );

        if (parsed.error) {
            return res.status(400).json({
                message: parsed.error
            });
        }

        const { activities, total } = await runActivityQuery(
            parsed.query,
            page,
            limit
        );

        return res.status(200).json({
            activities,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
