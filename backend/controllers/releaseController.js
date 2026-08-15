import mongoose from "mongoose";
import Release from "../models/releaseModel.js";
import Tag from "../models/tagModel.js";
import PullRequest from "../models/pullRequestModel.js";
import Issue from "../models/issueMode.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import { getRepoRoot } from "../utils/repoStorage.js";
import {
    findPreviousTaggedCommit,
    getCommit,
    getCommitsBetween,
    isValidTagName
} from "../utils/repoVersion.js";
import {
    createNotification,
    buildNotificationMessage
} from "../utils/notificationService.js";

const TITLE_MAX_LENGTH = 200;
const RELEASE_STATUSES = ["draft", "published"];
const CHANGES_MAX = 100;

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
};

/* create release */
export const createRelease = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const tagName =
            typeof req.body?.tagName === "string"
                ? req.body.tagName.trim()
                : "";
        const title =
            typeof req.body?.title === "string"
                ? req.body.title.trim()
                : "";
        const description =
            typeof req.body?.description === "string"
                ? req.body.description.trim()
                : "";

        if (tagName === "") {
            return res.status(400).json({
                message: "A tag is required"
            });
        }

        if (!isValidTagName(tagName)) {
            return res.status(400).json({
                message: "Invalid tag name"
            });
        }

        if (title === "") {
            return res.status(400).json({
                message: "Release title is required"
            });
        }

        if (title.length > TITLE_MAX_LENGTH) {
            return res.status(400).json({
                message: `Release title must be ${TITLE_MAX_LENGTH} characters or fewer`
            });
        }

        const tag = await Tag.findOne({
            repository: result.repository._id,
            name: tagName
        });

        if (!tag) {
            return res.status(400).json({
                message: `Tag "${tagName}" does not exist in this repository`
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const commit = await getCommit(repoRoot, tag.commitId);

        if (!commit) {
            return res.status(400).json({
                message: "Tagged commit no longer exists"
            });
        }

        const release = await Release.create({
            repository: result.repository._id,
            tagName,
            title,
            description,
            author: req.user._id,
            status: "draft",
            publishedAt: null
        });

        const populated = await Release.findById(release._id).populate(
            "author",
            "userName email"
        );

        return res.status(201).json(populated);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* list releases */
export const getReleases = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const { status } = req.query;

        if (status && !RELEASE_STATUSES.includes(status)) {
            return res.status(400).json({
                message: "Invalid status filter"
            });
        }

        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(
            parsePositiveInt(req.query.limit, 20),
            100
        );

        const query = {
            repository: result.repository._id
        };

        if (status) {
            query.status = status;
        }

        const [releases, total] = await Promise.all([
            Release.find(query)
                .select("-description")
                .populate("author", "userName email")
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Release.countDocuments(query)
        ]);

        return res.status(200).json({
            releases,
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

/* get release detail */
export const getReleaseById = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const { releaseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(releaseId)) {
            return res.status(400).json({
                message: "Invalid release ID"
            });
        }

        const release = await Release.findOne({
            repository: result.repository._id,
            _id: releaseId
        }).populate("author", "userName email");

        if (!release) {
            return res.status(404).json({
                message: "Release not found"
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const tag = await Tag.findOne({
            repository: result.repository._id,
            name: release.tagName
        });

        let commitId = null;
        let commit = null;

        if (tag) {
            commitId = tag.commitId;
            commit = await getCommit(repoRoot, commitId);
        }

        let changesSincePreviousTag = [];
        let previousTagName = null;

        if (tag && commit) {
            const otherTags = await Tag.find({
                repository: result.repository._id,
                name: { $ne: release.tagName }
            })
                .select("name commitId")
                .sort({ createdAt: 1 });

            const otherCommitIds = otherTags.map(
                (otherTag) => otherTag.commitId
            );

            const previousCommitId = await findPreviousTaggedCommit(
                repoRoot,
                tag.commitId,
                otherCommitIds
            );

            if (previousCommitId) {
                changesSincePreviousTag = (
                    await getCommitsBetween(
                        repoRoot,
                        previousCommitId,
                        tag.commitId
                    )
                ).slice(0, CHANGES_MAX);

                const previousTag = otherTags.find(
                    (otherTag) =>
                        otherTag.commitId === previousCommitId
                );

                if (previousTag) {
                    previousTagName = previousTag.name;
                }
            }
        }

        return res.status(200).json({
            _id: release._id,
            repository: release.repository,
            tagName: release.tagName,
            title: release.title,
            description: release.description,
            author: {
                _id: release.author?._id,
                userName: release.author?.userName,
                email: release.author?.email
            },
            status: release.status,
            publishedAt: release.publishedAt,
            createdAt: release.createdAt,
            updatedAt: release.updatedAt,
            commitId,
            commit: commit
                ? {
                    id: commit.id,
                    message: commit.message,
                    author: commit.author,
                    timestamp: commit.timestamp,
                    parent: commit.parent
                }
                : null,
            tagExists: Boolean(tag),
            changesSincePreviousTag,
            previousTagName
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* edit release / publish release */
export const updateRelease = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const { releaseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(releaseId)) {
            return res.status(400).json({
                message: "Invalid release ID"
            });
        }

        const release = await Release.findOne({
            repository: result.repository._id,
            _id: releaseId
        });

        if (!release) {
            return res.status(404).json({
                message: "Release not found"
            });
        }

        const { title, description, tagName, status } = req.body || {};

        if (
            title === undefined &&
            description === undefined &&
            tagName === undefined &&
            status === undefined
        ) {
            return res.status(400).json({
                message: "No valid fields to update"
            });
        }

        if (title !== undefined) {
            const trimmedTitle =
                typeof title === "string" ? title.trim() : "";

            if (trimmedTitle === "") {
                return res.status(400).json({
                    message: "Release title is required"
                });
            }

            if (trimmedTitle.length > TITLE_MAX_LENGTH) {
                return res.status(400).json({
                    message: `Release title must be ${TITLE_MAX_LENGTH} characters or fewer`
                });
            }

            release.title = trimmedTitle;
        }

        if (description !== undefined) {
            if (typeof description !== "string") {
                return res.status(400).json({
                    message: "Release notes must be a string"
                });
            }

            release.description = description.trim();
        }

        if (tagName !== undefined) {
            if (release.status === "published") {
                return res.status(400).json({
                    message: "Cannot change the tag of a published release"
                });
            }

            const trimmedTag =
                typeof tagName === "string" ? tagName.trim() : "";

            if (!isValidTagName(trimmedTag)) {
                return res.status(400).json({
                    message: "Invalid tag name"
                });
            }

            const tag = await Tag.findOne({
                repository: result.repository._id,
                name: trimmedTag
            });

            if (!tag) {
                return res.status(400).json({
                    message: `Tag "${trimmedTag}" does not exist in this repository`
                });
            }

            release.tagName = trimmedTag;
        }

        const wasPublishedBefore = release.status === "published";

        if (status !== undefined) {
            if (!RELEASE_STATUSES.includes(status)) {
                return res.status(400).json({
                    message: "Invalid status"
                });
            }

            if (status === "published") {
                if (release.status !== "published") {
                    release.status = "published";
                    release.publishedAt = release.publishedAt || new Date();
                }
            } else if (release.status === "published") {
                return res.status(400).json({
                    message: "Cannot revert a published release to draft"
                });
            }
        }

        await release.save();

        if (release.status === "published" && !wasPublishedBefore) {
            const [prAuthors, issueAuthors] = await Promise.all([
                PullRequest.distinct("author", {
                    repository: result.repository._id
                }),
                Issue.distinct("author", {
                    repository: result.repository._id
                })
            ]);

            const participants = new Set(
                [
                    ...prAuthors,
                    ...issueAuthors
                ].map((id) => id.toString())
            );

            participants.delete(req.user._id.toString());

            for (const participantId of participants) {
                await createNotification({
                    recipient: participantId,
                    actor: req.user._id,
                    type: "RELEASE_PUBLISHED",
                    repository: result.repository._id,
                    release: release._id,
                    message: buildNotificationMessage(
                        "RELEASE_PUBLISHED",
                        { title: release.title }
                    )
                });
            }
        }

        const populated = await Release.findById(release._id).populate(
            "author",
            "userName email"
        );

        return res.status(200).json(populated);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
