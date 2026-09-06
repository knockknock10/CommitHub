import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import ReviewComment from "../models/reviewCommentModel.js";
import PullRequest from "../models/pullRequestModel.js";
import Repository from "../models/repoModel.js";
import { getRepoRoot } from "../utils/repoStorage.js";
import {
    ensureVersionControl,
    getSnapshot
} from "../utils/repoVersion.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import {
    createNotification,
    createMentionNotifications,
    buildNotificationMessage
} from "../utils/notificationService.js";
import { createActivity } from "../utils/activityService.js";

const resolveHeadCommit = async (pullRequest) => {
    if (pullRequest.mergedCommitId) {
        return pullRequest.mergedCommitId;
    }

    const repoRoot = getRepoRoot(
        pullRequest.author,
        pullRequest.repository
    );

    try {
        const vcRoot = await ensureVersionControl(repoRoot);
        const refPath = path.join(
            vcRoot,
            "refs",
            "heads",
            pullRequest.sourceBranch
        );
        const ref = (
            await fs.readFile(refPath, "utf-8")
        ).trim();
        return ref || null;
    } catch {
        return null;
    }
};

const validateFileLine = async (
    repoRoot,
    commit,
    filePath,
    line
) => {
    if (!commit || !filePath) {
        return false;
    }

    try {
        const vcRoot = await ensureVersionControl(repoRoot);
        const snapshot = await getSnapshot(vcRoot, commit);

        if (!snapshot.files.includes(filePath)) {
            return false;
        }

        if (line == null) {
            return true;
        }

        const content = await fs.readFile(
            path.join(snapshot.root, filePath),
            "utf-8"
        );
        const lines = content.split("\n");
        return line >= 1 && line <= lines.length;
    } catch {
        return false;
    }
};

const isCommentOutdated = async (
    repoRoot,
    commentCommit,
    currentCommit,
    filePath,
    line
) => {
    if (!commentCommit || !currentCommit) {
        return false;
    }

    if (commentCommit === currentCommit) {
        return false;
    }

    try {
        const vcRoot = await ensureVersionControl(repoRoot);

        const [oldSnap, newSnap] = await Promise.all([
            getSnapshot(vcRoot, commentCommit),
            getSnapshot(vcRoot, currentCommit)
        ]);

        const hadFile = oldSnap.files.includes(filePath);
        const hasFile = newSnap.files.includes(filePath);

        if (!hadFile && hasFile) return false;
        if (hadFile && !hasFile) return true;
        if (!hadFile && !hasFile) return false;

        const oldContent = await fs.readFile(
            path.join(oldSnap.root, filePath),
            "utf-8"
        );
        const newContent = await fs.readFile(
            path.join(newSnap.root, filePath),
            "utf-8"
        );

        if (oldContent === newContent) return false;

        if (line == null) return true;

        const oldLines = oldContent.split("\n");

        if (line > oldLines.length) return true;

        const contextLine = oldLines[line - 1];
        const newLines = newContent.split("\n");
        return !newLines.includes(contextLine);
    } catch {
        return true;
    }
};

const loadPr = async (res, repository, prNumber) => {
    if (isNaN(prNumber)) {
        res.status(400).json({
            message: "Invalid pull request number"
        });
        return null;
    }

    const pullRequest = await PullRequest.findOne({
        repository: repository._id,
        number: prNumber
    });

    if (!pullRequest) {
        res.status(404).json({
            message: "Pull request not found"
        });
        return null;
    }

    return pullRequest;
};

export const createReviewComment = async (req, res) => {
    try {
        const authResult = await authorizeRepository(
            req, res, false
        );
        if (!authResult) return;

        const { repository } = authResult;
        const pullRequest = await loadPr(
            res,
            repository,
            parseInt(req.params.number, 10)
        );
        if (!pullRequest) return;

        const {
            body,
            commit,
            filePath,
            line,
            side,
            parentCommentId
        } = req.body;

        if (!body || !body.trim()) {
            return res.status(400).json({
                message: "Comment body is required"
            });
        }

        if (!commit || !filePath) {
            return res.status(400).json({
                message: "Commit and filePath are required"
            });
        }

        if (parentCommentId) {
            const parent = await ReviewComment.findOne({
                _id: parentCommentId,
                pullRequest: pullRequest._id
            });

            if (!parent) {
                return res.status(404).json({
                    message: "Parent comment not found"
                });
            }

            if (parent.parentComment) {
                return res.status(400).json({
                    message:
                        "Replies cannot have nested replies"
                });
            }
        }

        const repoRoot = getRepoRoot(
            repository.owner,
            repository._id
        );

        const valid = await validateFileLine(
            repoRoot,
            commit,
            filePath,
            line
        );

        if (!valid) {
            return res.status(400).json({
                message:
                    "Invalid file path or line number for the given commit"
            });
        }

        const comment = await ReviewComment.create({
            pullRequest: pullRequest._id,
            repository: repository._id,
            author: req.user._id,
            commit,
            filePath,
            line: line ?? null,
            side: side || "RIGHT",
            body: body.trim(),
            parentComment: parentCommentId || null,
            review: null
        });

        const populated = await ReviewComment.findById(
            comment._id
        ).populate("author", "userName email");

        const prCtx = {
            title: pullRequest.title,
            number: pullRequest.number
        };

        const recipients = new Set();

        if (
            pullRequest.author.toString() !==
            req.user._id.toString()
        ) {
            recipients.add(
                pullRequest.author.toString()
            );
        }

        if (parentCommentId) {
            const parent =
                await ReviewComment.findById(
                    parentCommentId
                ).populate("author", "_id");

            if (
                parent &&
                parent.author._id.toString() !==
                    req.user._id.toString()
            ) {
                recipients.add(
                    parent.author._id.toString()
                );
            }
        }

        for (const rid of recipients) {
            await createNotification({
                recipient: new mongoose.Types.ObjectId(rid),
                actor: req.user._id,
                type: "PR_COMMENTED",
                repository: repository._id,
                pullRequest: pullRequest._id,
                message: buildNotificationMessage(
                    "PR_COMMENTED",
                    prCtx
                )
            });
        }

        await createMentionNotifications({
            content: body,
            actor: req.user._id,
            repository: repository._id,
            pullRequest,
            excludeRecipients: [req.user._id]
        });

        if (!parentCommentId) {
            await createActivity({
                actor: req.user._id,
                type: "PR_COMMENTED",
                repository: repository._id,
                pullRequest: pullRequest._id,
                metadata: {
                    pullRequestNumber: pullRequest.number,
                    filePath,
                    line: line ?? null
                }
            });
        }

        return res.status(201).json(populated);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getReviewComments = async (req, res) => {
    try {
        const authResult = await authorizeRepository(
            req, res, false
        );
        if (!authResult) return;

        const { repository } = authResult;
        const pullRequest = await loadPr(
            res,
            repository,
            parseInt(req.params.number, 10)
        );
        if (!pullRequest) return;

        const { filePath, resolved } = req.query;

        const filter = {
            pullRequest: pullRequest._id
        };

        if (filePath) {
            filter.filePath = filePath;
        }

        if (resolved !== undefined) {
            filter.resolved = resolved === "true";
        }

        const comments = await ReviewComment.find(filter)
            .populate("author", "userName email")
            .populate("resolvedBy", "userName email")
            .sort({
                filePath: 1,
                line: 1,
                createdAt: 1
            });

        return res.status(200).json(comments);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const getReviewCommentThread = async (
    req,
    res
) => {
    try {
        const prNumber = parseInt(req.params.number, 10);

        if (isNaN(prNumber)) {
            return res.status(400).json({
                message: "Invalid pull request number"
            });
        }

        const comment = await ReviewComment.findById(
            req.params.commentId
        )
            .populate("author", "userName email")
            .populate("resolvedBy", "userName email");

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const pr = await PullRequest.findById(
            comment.pullRequest
        );

        if (!pr || pr.number !== prNumber) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const replies = await ReviewComment.find({
            parentComment: comment._id
        })
            .populate("author", "userName email")
            .sort({ createdAt: 1 });

        return res.status(200).json({
            comment,
            replies
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const replyToReviewComment = async (req, res) => {
    try {
        const authResult = await authorizeRepository(
            req, res, false
        );
        if (!authResult) return;

        const { repository } = authResult;
        const pullRequest = await loadPr(
            res,
            repository,
            parseInt(req.params.number, 10)
        );
        if (!pullRequest) return;

        const parent = await ReviewComment.findOne({
            _id: req.params.commentId,
            pullRequest: pullRequest._id
        });

        if (!parent) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (parent.parentComment) {
            return res.status(400).json({
                message:
                    "Replies cannot have nested replies"
            });
        }

        const { body } = req.body;

        if (!body || !body.trim()) {
            return res.status(400).json({
                message: "Comment body is required"
            });
        }

        const reply = await ReviewComment.create({
            pullRequest: pullRequest._id,
            repository: repository._id,
            author: req.user._id,
            commit: parent.commit,
            filePath: parent.filePath,
            line: parent.line,
            side: parent.side,
            body: body.trim(),
            parentComment: parent._id,
            review: null
        });

        const populated = await ReviewComment.findById(
            reply._id
        ).populate("author", "userName email");

        const prCtx = {
            title: pullRequest.title,
            number: pullRequest.number
        };

        const replyRecipients = new Set();

        if (
            pullRequest.author.toString() !==
            req.user._id.toString()
        ) {
            replyRecipients.add(
                pullRequest.author.toString()
            );
        }

        if (
            parent.author.toString() !==
            req.user._id.toString()
        ) {
            replyRecipients.add(
                parent.author.toString()
            );
        }

        for (const rid of replyRecipients) {
            await createNotification({
                recipient: new mongoose.Types.ObjectId(rid),
                actor: req.user._id,
                type: "PR_COMMENTED",
                repository: repository._id,
                pullRequest: pullRequest._id,
                message: buildNotificationMessage(
                    "PR_COMMENTED",
                    prCtx
                )
            });
        }

        await createMentionNotifications({
            content: body,
            actor: req.user._id,
            repository: repository._id,
            pullRequest,
            excludeRecipients: [req.user._id]
        });

        return res.status(201).json(populated);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const resolveThread = async (req, res) => {
    try {
        const authResult = await authorizeRepository(
            req, res, true
        );
        if (!authResult) return;

        const { repository } = authResult;
        const pullRequest = await loadPr(
            res,
            repository,
            parseInt(req.params.number, 10)
        );
        if (!pullRequest) return;

        const comment = await ReviewComment.findOne({
            _id: req.params.commentId,
            pullRequest: pullRequest._id
        });

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (comment.parentComment) {
            return res.status(400).json({
                message:
                    "Only root comments can be resolved"
            });
        }

        if (comment.resolved) {
            return res.status(400).json({
                message: "Thread is already resolved"
            });
        }

        comment.resolved = true;
        comment.resolvedBy = req.user._id;
        comment.resolvedAt = new Date();
        await comment.save();

        return res.status(200).json({
            message: "Thread resolved",
            comment
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const unresolveThread = async (req, res) => {
    try {
        const authResult = await authorizeRepository(
            req, res, true
        );
        if (!authResult) return;

        const { repository } = authResult;
        const pullRequest = await loadPr(
            res,
            repository,
            parseInt(req.params.number, 10)
        );
        if (!pullRequest) return;

        const comment = await ReviewComment.findOne({
            _id: req.params.commentId,
            pullRequest: pullRequest._id
        });

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (comment.parentComment) {
            return res.status(400).json({
                message:
                    "Only root comments can be unresolved"
            });
        }

        if (!comment.resolved) {
            return res.status(400).json({
                message: "Thread is not resolved"
            });
        }

        comment.resolved = false;
        comment.resolvedBy = null;
        comment.resolvedAt = null;
        await comment.save();

        return res.status(200).json({
            message: "Thread unresolved",
            comment
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const editReviewComment = async (req, res) => {
    try {
        const comment = await ReviewComment.findById(
            req.params.commentId
        );

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        if (
            comment.author.toString() !==
            req.user._id.toString()
        ) {
            return res.status(403).json({
                message:
                    "Only the author can edit this comment"
            });
        }

        const { body } = req.body;

        if (!body || !body.trim()) {
            return res.status(400).json({
                message: "Comment body is required"
            });
        }

        comment.body = body.trim();
        await comment.save();

        const populated = await ReviewComment.findById(
            comment._id
        ).populate("author", "userName email");

        return res.status(200).json(populated);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const deleteReviewComment = async (req, res) => {
    try {
        const comment = await ReviewComment.findById(
            req.params.commentId
        );

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const repository = await Repository.findById(
            comment.repository
        );

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isAuthor =
            comment.author.toString() ===
            req.user._id.toString();

        const isOwner =
            repository.owner.toString() ===
            req.user._id.toString();

        if (!isAuthor && !isOwner) {
            return res.status(403).json({
                message: "Not authorized"
            });
        }

        await ReviewComment.deleteMany({
            parentComment: comment._id
        });

        await comment.deleteOne();

        return res.status(200).json({
            message: "Comment deleted"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const markOutdatedComments = async (
    pullRequest
) => {
    try {
        const repoRoot = getRepoRoot(
            pullRequest.author,
            pullRequest.repository
        );

        const headCommit = await resolveHeadCommit(
            pullRequest
        );

        if (!headCommit) return;

        const comments = await ReviewComment.find({
            pullRequest: pullRequest._id,
            outdated: false
        });

        for (const c of comments) {
            if (c.commit === headCommit) continue;

            const outdated = await isCommentOutdated(
                repoRoot,
                c.commit,
                headCommit,
                c.filePath,
                c.line
            );

            if (outdated) {
                c.outdated = true;
                await c.save();
            }
        }
    } catch {
        // best-effort — never fail the primary operation
    }
};
