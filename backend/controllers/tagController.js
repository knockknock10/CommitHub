import Tag from "../models/tagModel.js";
import Release from "../models/releaseModel.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import { getRepoRoot } from "../utils/repoStorage.js";
import {
    ensureVersionControl,
    getCommit,
    getHeadCommitId,
    isValidCommitId,
    isValidTagName,
    createTagRef,
    deleteTagRef
} from "../utils/repoVersion.js";

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
};

const serializeTag = (tag) => ({
    name: tag.name,
    commitId: tag.commitId,
    creator: {
        _id: tag.creator?._id,
        userName: tag.creator?.userName,
        email: tag.creator?.email
    },
    createdAt: tag.createdAt
});

/* create tag */
export const createTag = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const name =
            typeof req.body?.name === "string"
                ? req.body.name.trim()
                : "";

        if (name === "") {
            return res.status(400).json({
                message: "Tag name is required"
            });
        }

        if (!isValidTagName(name)) {
            return res.status(400).json({
                message: "Invalid tag name"
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        let commitId =
            typeof req.body?.commitId === "string"
                ? req.body.commitId.trim()
                : "";

        if (commitId === "") {
            const vcRoot = await ensureVersionControl(repoRoot);
            commitId = await getHeadCommitId(vcRoot);

            if (!commitId) {
                return res.status(400).json({
                    message: "Repository has no commits to tag"
                });
            }
        } else if (!isValidCommitId(commitId)) {
            return res.status(400).json({
                message: "Invalid commit ID"
            });
        }

        const commit = await getCommit(repoRoot, commitId);

        if (!commit) {
            return res.status(404).json({
                message: "Commit not found"
            });
        }

        try {
            await createTagRef(repoRoot, name, commitId);
        } catch (error) {
            if (error.code === "TAG_EXISTS") {
                return res.status(400).json({
                    message: error.message
                });
            }

            if (error.code === "INVALID_TAG_NAME") {
                return res.status(400).json({
                    message: "Invalid tag name"
                });
            }

            throw error;
        }

        let tag;

        try {
            tag = await Tag.create({
                repository: result.repository._id,
                name,
                commitId,
                creator: req.user._id
            });
        } catch (error) {
            await deleteTagRef(repoRoot, name).catch(() => {});

            if (error.code === 11000) {
                return res.status(400).json({
                    message: `Tag "${name}" already exists`
                });
            }

            throw error;
        }

        const populated = await Tag.findById(tag._id).populate(
            "creator",
            "userName email"
        );

        return res.status(201).json({
            ...serializeTag(populated),
            commit: {
                id: commit.id,
                message: commit.message,
                author: commit.author,
                timestamp: commit.timestamp,
                parent: commit.parent
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* list tags */
export const getTags = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(
            parsePositiveInt(req.query.limit, 50),
            100
        );

        const query = {
            repository: result.repository._id
        };

        const [tags, total] = await Promise.all([
            Tag.find(query)
                .populate("creator", "userName email")
                .sort({ name: 1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Tag.countDocuments(query)
        ]);

        return res.status(200).json({
            tags: tags.map(serializeTag),
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

/* get tag */
export const getTag = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const { tagName } = req.params;

        if (!isValidTagName(tagName)) {
            return res.status(400).json({
                message: "Invalid tag name"
            });
        }

        const tag = await Tag.findOne({
            repository: result.repository._id,
            name: tagName
        }).populate("creator", "userName email");

        if (!tag) {
            return res.status(404).json({
                message: "Tag not found"
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const commit = await getCommit(repoRoot, tag.commitId);

        return res.status(200).json({
            ...serializeTag(tag),
            commit: commit
                ? {
                    id: commit.id,
                    message: commit.message,
                    author: commit.author,
                    timestamp: commit.timestamp,
                    parent: commit.parent
                }
                : null
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* delete tag */
export const deleteTag = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const { tagName } = req.params;

        if (!isValidTagName(tagName)) {
            return res.status(400).json({
                message: "Invalid tag name"
            });
        }

        const tag = await Tag.findOne({
            repository: result.repository._id,
            name: tagName
        });

        if (!tag) {
            return res.status(404).json({
                message: "Tag not found"
            });
        }

        const referencingReleases = await Release.countDocuments({
            repository: result.repository._id,
            tagName
        });

        if (referencingReleases > 0) {
            return res.status(400).json({
                message: `Tag "${tagName}" is referenced by a release`
            });
        }

        await Tag.deleteOne({ _id: tag._id });

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        await deleteTagRef(repoRoot, tagName).catch(() => {});

        return res.status(200).json({
            message: "Tag deleted",
            name: tagName
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
