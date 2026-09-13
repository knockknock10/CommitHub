import Comment from "../models/commentModel.js";
import Issue from "../models/issueModel.js";
import Repository from "../models/repoModel.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import {
    createNotification,
    createMentionNotifications,
    buildNotificationMessage
} from "../services/notificationService.js";
import { createActivity } from "../services/activityService.js";

/* Load an issue by ID and authorize the acting user against the issue's
   own repository. Writes the 403/404 response itself, returns null when
   denied. */
const authorizeIssueRepository = async (req, res, issueId, writeOperation) => {
    const issue = await Issue.findById(issueId);

    if (!issue || !issue.repository) {
        res.status(404).json({
            message: "Issue not found"
        });
        return null;
    }

    const repository = await Repository.findById(
        issue.repository
    );

    if (!repository) {
        res.status(404).json({
            message: "Issue not found"
        });
        return null;
    }

    const original = req.params;
    req.params = { id: repository._id.toString() };

    try {
        const result = await authorizeRepository(
            req,
            res,
            writeOperation
        );

        if (!result) {
            return null;
        }

        return {
            issue,
            repository,
            auth: result
        };
    } finally {
        req.params = original;
    }
};

export const createComment = async (req, res) => {
    try {
        /* Comments are a read-level collaborative artifact (like issues):
           any user who can read the issue's repository may comment. The
           read gate protects private issue threads from unauthored access.
           Previously this endpoint had NO repository authorization at all. */
        const result = await authorizeIssueRepository(
            req,
            res,
            req.params.issueId,
            false
        );

        if (!result) {
            return;
        }

        const { issue } = result;

        const content =
            typeof req.body?.content === "string"
                ? req.body.content.trim()
                : "";

        if (content === "") {
            return res.status(400).json({
                message: "Comment content is required"
            });
        }

        const comment = await Comment.create({
            content,
            author: req.user._id,
            issue: issue._id
        });

        await createNotification({
            recipient: issue.author,
            actor: req.user._id,
            type: "ISSUE_COMMENTED",
            repository: issue.repository,
            issue: issue._id,
            comment: comment._id,
            message: buildNotificationMessage(
                "ISSUE_COMMENTED",
                { title: issue.title }
            )
        });

        await createMentionNotifications({
            content,
            actor: req.user._id,
            repository: issue.repository,
            issue,
            excludeRecipients: [issue.author]
        });

        await createActivity({
            actor: req.user._id,
            type: "ISSUE_COMMENTED",
            repository: issue.repository,
            issue: issue._id,
            metadata: { issueTitle: issue.title }
        });

        const populatedComment = await Comment.findById(
            comment._id
        )
            .populate("author", "userName email");

        res.status(201).json(populatedComment);
    } catch (err) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

export const getIssueComments = async (req, res) => {
    try {
        const result = await authorizeIssueRepository(
            req,
            res,
            req.params.issueId,
            false
        );

        if (!result) {
            return;
        }

        const comments = await Comment.find({
            issue: result.issue._id
        })
            .populate("author", "userName email")
            .sort({ createdAt: 1 });

        res.status(200).json(comments);
    } catch (err) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(
            req.params.commentId
        );

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found"
            });
        }

        const result = await authorizeIssueRepository(
            req,
            res,
            comment.issue,
            false
        );

        if (!result) {
            return;
        }

        /* repository author or comment author may delete the comment.
           The acting user must already hold read access to the
           comment's repository (checked above), so private issue
           threads are protected from non-members. */
        const isAuthor =
            comment.author.toString() ===
            req.user._id.toString();

        const isRepoOwner =
            result.repository.owner &&
            result.repository.owner.toString() ===
            req.user._id.toString();

        if (!isAuthor && !isRepoOwner) {
            return res.status(403).json({
                message: "Not authorized"
            });
        }

        await comment.deleteOne();

        res.status(200).json({
            message: "Comment deleted"
        });
    } catch (err) {
        res.status(500).json({
            message: "Server error"
        });
    }
};
