import PullRequest from "../models/pullRequestModel.js";
import Repository from "../models/repoModel.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import { getRepoRoot } from "../utils/repoStorage.js";
import {
    getBranchCommitId,
    getCommitsBetween,
    getCommitDiff,
    fastForwardMerge,
    restoreBranchRef
} from "../utils/repoVersion.js";
import {
    createNotification,
    createMentionNotifications,
    buildNotificationMessage
} from "../utils/notificationService.js";
import { createActivity } from "../utils/activityService.js";

const TITLE_MAX_LENGTH = 200;
const REVIEW_COMMENT_MAX_LENGTH = 500;
const REVIEW_STATES = ["approved", "changes_requested", "commented"];
const PR_STATUSES = ["open", "closed", "merged"];

const parseNumber = (value) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return 0;
    }

    return parsed;
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
};

const findPullRequest = async (repositoryId, number) =>
    PullRequest.findOne({
        repository: repositoryId,
        number
    });

const canManagePullRequest = (pullRequest, user, isOwner) =>
    isOwner ||
    pullRequest.author.toString() === user._id.toString();

const deriveReviewState = (reviews) => {
    const states = reviews.map((review) => review.state);

    if (states.includes("changes_requested")) {
        return "changes_requested";
    }

    if (states.includes("approved")) {
        return "approved";
    }

    if (states.length > 0) {
        return "commented";
    }

    return "pending";
};

/* create pull request */
export const createPullRequest = async (req, res) => {
    const {
        sourceBranch,
        targetBranch,
        title,
        description
    } = req.body || {};

    const trimmedSource =
        typeof sourceBranch === "string"
            ? sourceBranch.trim()
            : "";
    const trimmedTarget =
        typeof targetBranch === "string"
            ? targetBranch.trim()
            : "";

    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const trimmedTitle =
            typeof title === "string" ? title.trim() : "";

        if (trimmedTitle === "") {
            return res.status(400).json({
                message: "Pull request title is required"
            });
        }

        if (trimmedTitle.length > TITLE_MAX_LENGTH) {
            return res.status(400).json({
                message: `Pull request title must be ${TITLE_MAX_LENGTH} characters or fewer`
            });
        }

        if (trimmedSource === "" || trimmedTarget === "") {
            return res.status(400).json({
                message: "Source and target branches are required"
            });
        }

        if (trimmedSource === trimmedTarget) {
            return res.status(400).json({
                message: "Source and target branches must be different"
            });
        }

        const trimmedDescription =
            typeof description === "string"
                ? description.trim()
                : "";

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const sourceCommitId = await getBranchCommitId(
            repoRoot,
            trimmedSource
        );
        const targetCommitId = await getBranchCommitId(
            repoRoot,
            trimmedTarget
        );

        if (sourceCommitId === null) {
            return res.status(400).json({
                message: `Branch "${trimmedSource}" has no commits`
            });
        }

        if (targetCommitId === null) {
            return res.status(400).json({
                message: `Branch "${trimmedTarget}" has no commits`
            });
        }

        const duplicate = await PullRequest.findOne({
            repository: result.repository._id,
            sourceBranch: trimmedSource,
            targetBranch: trimmedTarget,
            status: "open"
        });

        if (duplicate) {
            return res.status(400).json({
                message: `An open pull request already exists for "${trimmedSource}" into "${trimmedTarget}" (#${duplicate.number})`
            });
        }

        const updated = await Repository.findOneAndUpdate(
            { _id: result.repository._id },
            { $inc: { prCount: 1 } },
            { returnDocument: "after" }
        );

        const pullRequest = await PullRequest.create({
            number: updated.prCount,
            repository: result.repository._id,
            author: req.user._id,
            sourceBranch: trimmedSource,
            targetBranch: trimmedTarget,
            title: trimmedTitle,
            description: trimmedDescription
        });

        const populated = await PullRequest.findById(
            pullRequest._id
        ).populate("author", "userName email");

        await createNotification({
            recipient: result.repository.owner,
            actor: req.user._id,
            type: "PR_CREATED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            message: buildNotificationMessage(
                "PR_CREATED",
                {
                    title: trimmedTitle,
                    number: pullRequest.number
                }
            )
        });

        await createActivity({
            actor: req.user._id,
            type: "PR_CREATED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            metadata: {
                pullRequestNumber: pullRequest.number,
                pullRequestTitle: trimmedTitle
            }
        });

        return res.status(201).json(populated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: `An open pull request already exists for "${trimmedSource}" into "${trimmedTarget}"`
            });
        }

        if (error.code === "INVALID_BRANCH_NAME") {
            return res.status(400).json({
                message: "Invalid branch name"
            });
        }

        if (error.code === "BRANCH_NOT_FOUND") {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* list pull requests */
export const getPullRequests = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const { status } = req.query;

        if (status && !PR_STATUSES.includes(status)) {
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

        const [pullRequests, total] = await Promise.all([
            PullRequest.find(query)
                .select("-comments -reviews")
                .populate("author", "userName email")
                .sort({ number: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            PullRequest.countDocuments(query)
        ]);

        const reviewStates = await PullRequest.find({
            _id: { $in: pullRequests.map((pr) => pr._id) }
        }).select("reviews.state");

        const reviewStateByPullRequest = Object.fromEntries(
            reviewStates.map((pr) => [
                pr._id.toString(),
                deriveReviewState(pr.reviews)
            ])
        );

        const withReviewState = pullRequests.map((pullRequest) => {
            const doc = pullRequest.toObject();

            doc.reviewState =
                reviewStateByPullRequest[
                    pullRequest._id.toString()
                ] || "pending";

            return doc;
        });

        return res.status(200).json({
            pullRequests: withReviewState,
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

/* get pull request detail */
export const getPullRequestById = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const number = parseNumber(req.params.number);

        if (number === 0) {
            return res.status(400).json({
                message: "Invalid pull request number"
            });
        }

        const pullRequest = await PullRequest.findOne({
            repository: result.repository._id,
            number
        })
            .populate("author", "userName email")
            .populate("mergedBy", "userName email")
            .populate("reviews.reviewer", "userName email")
            .populate("comments.author", "userName email");

        if (!pullRequest) {
            return res.status(404).json({
                message: "Pull request not found"
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        let sourceCommitId = null;
        let targetCommitId = null;

        try {
            sourceCommitId = await getBranchCommitId(
                repoRoot,
                pullRequest.sourceBranch
            );
        } catch {
            sourceCommitId = null;
        }

        try {
            targetCommitId = await getBranchCommitId(
                repoRoot,
                pullRequest.targetBranch
            );
        } catch {
            targetCommitId = null;
        }

        let commits = [];
        let diff = null;

        if (sourceCommitId) {
            [commits, diff] = await Promise.all([
                getCommitsBetween(
                    repoRoot,
                    targetCommitId,
                    sourceCommitId
                ),
                getCommitDiff(
                    repoRoot,
                    targetCommitId,
                    sourceCommitId
                )
            ]);
        }

        return res.status(200).json({
            ...pullRequest.toObject(),
            reviewState: deriveReviewState(pullRequest.reviews),
            commits,
            diff,
            sourceCommitId,
            targetCommitId,
            sourceBranchExists: sourceCommitId !== null,
            targetBranchExists: targetCommitId !== null
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* update pull request */
export const updatePullRequest = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const number = parseNumber(req.params.number);

        if (number === 0) {
            return res.status(400).json({
                message: "Invalid pull request number"
            });
        }

        const pullRequest = await findPullRequest(
            result.repository._id,
            number
        );

        if (!pullRequest) {
            return res.status(404).json({
                message: "Pull request not found"
            });
        }

        if (!canManagePullRequest(
            pullRequest,
            req.user,
            result.isOwner
        )) {
            return res.status(403).json({
                message: "You do not have access to this pull request"
            });
        }

        const { title, description } = req.body || {};

        const trimmedTitle =
            typeof title === "string" ? title.trim() : null;

        if (trimmedTitle !== null && trimmedTitle === "") {
            return res.status(400).json({
                message: "Pull request title cannot be empty"
            });
        }

        if (
            trimmedTitle !== null &&
            trimmedTitle.length > TITLE_MAX_LENGTH
        ) {
            return res.status(400).json({
                message: `Pull request title must be ${TITLE_MAX_LENGTH} characters or fewer`
            });
        }

        if (trimmedTitle !== null) {
            pullRequest.title = trimmedTitle;
        }

        if (typeof description === "string") {
            pullRequest.description = description.trim();
        }

        await pullRequest.save();

        const populated = await PullRequest.findById(
            pullRequest._id
        ).populate("author", "userName email");

        return res.status(200).json(populated);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* close pull request */
export const closePullRequest = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const number = parseNumber(req.params.number);

        if (number === 0) {
            return res.status(400).json({
                message: "Invalid pull request number"
            });
        }

        const pullRequest = await findPullRequest(
            result.repository._id,
            number
        );

        if (!pullRequest) {
            return res.status(404).json({
                message: "Pull request not found"
            });
        }

        if (!canManagePullRequest(
            pullRequest,
            req.user,
            result.isOwner
        )) {
            return res.status(403).json({
                message: "You do not have access to this pull request"
            });
        }

        if (pullRequest.status !== "open") {
            return res.status(400).json({
                message: "Only open pull requests can be closed"
            });
        }

        pullRequest.status = "closed";

        await pullRequest.save();

        await createNotification({
            recipient: pullRequest.author,
            actor: req.user._id,
            type: "PR_CLOSED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            message: buildNotificationMessage(
                "PR_CLOSED",
                {
                    title: pullRequest.title,
                    number: pullRequest.number
                }
            )
        });

        await createActivity({
            actor: req.user._id,
            type: "PR_CLOSED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            metadata: {
                pullRequestNumber: pullRequest.number,
                pullRequestTitle: pullRequest.title
            }
        });

        return res.status(200).json({
            message: "Pull request closed",
            number: pullRequest.number
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* reopen pull request */
export const reopenPullRequest = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const number = parseNumber(req.params.number);

        if (number === 0) {
            return res.status(400).json({
                message: "Invalid pull request number"
            });
        }

        const pullRequest = await findPullRequest(
            result.repository._id,
            number
        );

        if (!pullRequest) {
            return res.status(404).json({
                message: "Pull request not found"
            });
        }

        if (!canManagePullRequest(
            pullRequest,
            req.user,
            result.isOwner
        )) {
            return res.status(403).json({
                message: "You do not have access to this pull request"
            });
        }

        if (pullRequest.status !== "closed") {
            return res.status(400).json({
                message: "Only closed pull requests can be reopened"
            });
        }

        const conflicting = await PullRequest.findOne({
            repository: result.repository._id,
            sourceBranch: pullRequest.sourceBranch,
            targetBranch: pullRequest.targetBranch,
            status: "open",
            _id: { $ne: pullRequest._id }
        });

        if (conflicting) {
            return res.status(400).json({
                message: `An open pull request already exists for "${pullRequest.sourceBranch}" into "${pullRequest.targetBranch}" (#${conflicting.number})`
            });
        }

        pullRequest.status = "open";

        await pullRequest.save();

        await createNotification({
            recipient: pullRequest.author,
            actor: req.user._id,
            type: "PR_REOPENED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            message: buildNotificationMessage(
                "PR_REOPENED",
                {
                    title: pullRequest.title,
                    number: pullRequest.number
                }
            )
        });

        await createActivity({
            actor: req.user._id,
            type: "PR_REOPENED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            metadata: {
                pullRequestNumber: pullRequest.number,
                pullRequestTitle: pullRequest.title
            }
        });

        return res.status(200).json({
            message: "Pull request reopened",
            number: pullRequest.number
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "An open pull request already exists for this branch pair"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* submit review */
export const submitReview = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const number = parseNumber(req.params.number);

        if (number === 0) {
            return res.status(400).json({
                message: "Invalid pull request number"
            });
        }

        const pullRequest = await findPullRequest(
            result.repository._id,
            number
        );

        if (!pullRequest) {
            return res.status(404).json({
                message: "Pull request not found"
            });
        }

        if (
            pullRequest.author.toString() ===
            req.user._id.toString()
        ) {
            return res.status(400).json({
                message: "You cannot review your own pull request"
            });
        }

        const state = req.body?.state;

        if (!REVIEW_STATES.includes(state)) {
            return res.status(400).json({
                message: "Review state must be approved, changes_requested, or commented"
            });
        }

        const comment =
            typeof req.body?.comment === "string"
                ? req.body.comment.trim()
                : "";

        if (comment.length > REVIEW_COMMENT_MAX_LENGTH) {
            return res.status(400).json({
                message: `Review comment must be ${REVIEW_COMMENT_MAX_LENGTH} characters or fewer`
            });
        }

        pullRequest.reviews.push({
            reviewer: req.user._id,
            state,
            comment
        });

        await pullRequest.save();

        await createNotification({
            recipient: pullRequest.author,
            actor: req.user._id,
            type: "PR_REVIEWED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            message: buildNotificationMessage(
                "PR_REVIEWED",
                {
                    title: pullRequest.title,
                    number: pullRequest.number
                }
            )
        });

        await createActivity({
            actor: req.user._id,
            type: "PR_REVIEWED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            metadata: {
                pullRequestNumber: pullRequest.number,
                reviewState: state
            }
        });

        const populated = await PullRequest.findById(
            pullRequest._id
        ).populate("reviews.reviewer", "userName email");

        return res.status(201).json(
            populated.reviews[populated.reviews.length - 1]
        );
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* add pull request comment */
export const addPullRequestComment = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const number = parseNumber(req.params.number);

        if (number === 0) {
            return res.status(400).json({
                message: "Invalid pull request number"
            });
        }

        const pullRequest = await findPullRequest(
            result.repository._id,
            number
        );

        if (!pullRequest) {
            return res.status(404).json({
                message: "Pull request not found"
            });
        }

        const content =
            typeof req.body?.content === "string"
                ? req.body.content.trim()
                : "";

        if (content === "") {
            return res.status(400).json({
                message: "Comment content is required"
            });
        }

        pullRequest.comments.push({
            author: req.user._id,
            content
        });

        await pullRequest.save();

        await createNotification({
            recipient: pullRequest.author,
            actor: req.user._id,
            type: "PR_COMMENTED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            message: buildNotificationMessage(
                "PR_COMMENTED",
                {
                    title: pullRequest.title,
                    number: pullRequest.number
                }
            )
        });

        await createMentionNotifications({
            content,
            actor: req.user._id,
            repository: result.repository._id,
            pullRequest,
            excludeRecipients: [pullRequest.author]
        });

        await createActivity({
            actor: req.user._id,
            type: "PR_COMMENTED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            metadata: { pullRequestNumber: pullRequest.number }
        });

        const populated = await PullRequest.findById(
            pullRequest._id
        ).populate("comments.author", "userName email");

        return res.status(201).json(
            populated.comments[populated.comments.length - 1]
        );
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* merge pull request */
export const mergePullRequest = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const number = parseNumber(req.params.number);

        if (number === 0) {
            return res.status(400).json({
                message: "Invalid pull request number"
            });
        }

        const pullRequest = await findPullRequest(
            result.repository._id,
            number
        );

        if (!pullRequest) {
            return res.status(404).json({
                message: "Pull request not found"
            });
        }

        if (pullRequest.status !== "open") {
            return res.status(400).json({
                message: "Only open pull requests can be merged"
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const readBranchCommit = async (branch) => {
            try {
                return await getBranchCommitId(repoRoot, branch);
            } catch (error) {
                if (error.code === "BRANCH_NOT_FOUND") {
                    return null;
                }

                throw error;
            }
        };

        const sourceCommitId = await readBranchCommit(
            pullRequest.sourceBranch
        );
        const targetCommitId = await readBranchCommit(
            pullRequest.targetBranch
        );

        if (sourceCommitId === null) {
            return res.status(400).json({
                message: `Source branch "${pullRequest.sourceBranch}" no longer exists`
            });
        }

        if (targetCommitId === null) {
            return res.status(400).json({
                message: `Target branch "${pullRequest.targetBranch}" no longer exists`
            });
        }

        let resultData = null;
        let previousTargetCommitId = null;
        let workingTreeUpdated = false;

        if (targetCommitId === sourceCommitId) {
            resultData = {
                merged: true,
                alreadyUpToDate: true,
                sourceCommitId,
                targetCommitId
            };
        } else {
            try {
                resultData = await fastForwardMerge(
                    repoRoot,
                    pullRequest.sourceBranch,
                    pullRequest.targetBranch
                );
            } catch (error) {
                if (error.code === "DIVERGED") {
                    return res.status(409).json({
                        message: error.message,
                        reason: "DIVERGED"
                    });
                }

                if (error.code === "DIRTY_TREE") {
                    return res.status(400).json({
                        message: error.message
                    });
                }

                if (
                    error.code === "BRANCH_NOT_FOUND" ||
                    error.code === "BRANCH_HAS_NO_COMMITS" ||
                    error.code === "INVALID_BRANCH_NAME"
                ) {
                    return res.status(400).json({
                        message: error.message
                    });
                }

                throw error;
            }

            if (
                resultData.merged === false &&
                resultData.reason === "ALREADY_UP_TO_DATE"
            ) {
                return res.status(400).json({
                    message: "Target branch is already up to date"
                });
            }

            previousTargetCommitId =
                resultData.previousTargetCommitId || null;
            workingTreeUpdated =
                resultData.workingTreeUpdated || false;
        }

        try {
            pullRequest.status = "merged";
            pullRequest.mergedAt = new Date();
            pullRequest.mergedBy = req.user._id;
            pullRequest.mergeSourceCommitId = sourceCommitId;
            pullRequest.mergeCommitId =
                resultData.targetCommitId || sourceCommitId;

            await pullRequest.save();
        } catch (error) {
            if (previousTargetCommitId && workingTreeUpdated) {
                try {
                    await restoreBranchRef(
                        repoRoot,
                        pullRequest.targetBranch,
                        sourceCommitId,
                        previousTargetCommitId
                    );
                } catch {
                    /* best effort rollback */
                }
            }

            throw error;
        }

        await createNotification({
            recipient: pullRequest.author,
            actor: req.user._id,
            type: "PR_MERGED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            message: buildNotificationMessage(
                "PR_MERGED",
                {
                    title: pullRequest.title,
                    number: pullRequest.number
                }
            )
        });

        await createActivity({
            actor: req.user._id,
            type: "PR_MERGED",
            repository: result.repository._id,
            pullRequest: pullRequest._id,
            metadata: {
                pullRequestNumber: pullRequest.number,
                pullRequestTitle: pullRequest.title
            }
        });

        return res.status(200).json({
            message: "Pull request merged",
            merged: true,
            number: pullRequest.number,
            sourceBranch: pullRequest.sourceBranch,
            targetBranch: pullRequest.targetBranch,
            mergeCommitId: pullRequest.mergeCommitId,
            alreadyUpToDate: resultData.alreadyUpToDate === true
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
