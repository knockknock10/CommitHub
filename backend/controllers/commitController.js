import { getRepoRoot } from "../utils/repoStorage.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import {
    MAX_COMMIT_MESSAGE_LENGTH,
    DEFAULT_HISTORY_LIMIT,
    MAX_HISTORY_LIMIT,
    createCommit as performCommit,
    getCommit as readCommit,
    getCommitHistory as readCommitHistory,
    getCurrentBranch as readCurrentBranch,
    getWorkingTreeChanges as computeWorkingTreeChanges
} from "../utils/repoVersion.js";

const parseLimit = (value) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return DEFAULT_HISTORY_LIMIT;
    }

    return Math.min(parsed, MAX_HISTORY_LIMIT);
};

const parseOffset = (value) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }

    return parsed;
};

/* create commit */
export const createCommit = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const message =
            typeof req.body?.message === "string"
                ? req.body.message.trim()
                : "";

        if (message === "") {
            return res.status(400).json({
                message: "Commit message is required"
            });
        }

        if (message.length > MAX_COMMIT_MESSAGE_LENGTH) {
            return res.status(400).json({
                message: `Commit message must be ${MAX_COMMIT_MESSAGE_LENGTH} characters or fewer`
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const commit = await performCommit(repoRoot, {
            message,
            author: {
                name: req.user.userName,
                email: req.user.email
            }
        });

        return res.status(201).json(commit);
    } catch (error) {
        if (error.code === "NO_CHANGES") {
            return res.status(400).json({
                message: "No changes to commit"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* get working tree changes */
export const getWorkingTreeChanges = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const changes = await computeWorkingTreeChanges(repoRoot);

        return res.status(200).json({ changes });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* get commit history */
export const getCommitHistory = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const limit = parseLimit(req.query.limit);
        const offset = parseOffset(req.query.offset);

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const [currentBranch, commits] = await Promise.all([
            readCurrentBranch(repoRoot),
            readCommitHistory(repoRoot, { limit, offset })
        ]);

        return res.status(200).json({ currentBranch, commits });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* get single commit */
export const getCommit = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const { commitId } = req.params;

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const commit = await readCommit(repoRoot, commitId);

        if (!commit) {
            return res.status(404).json({
                message: "Commit not found"
            });
        }

        return res.status(200).json(commit);
    } catch (error) {
        if (error.code === "INVALID_COMMIT_ID") {
            return res.status(400).json({
                message: "Invalid commit ID"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};
