import Issue from "../models/issueModel.js";
import Repository from "../models/repoModel.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import {
    createNotification,
    buildNotificationMessage
} from "../services/notificationService.js";
import { createActivity } from "../services/activityService.js";

/* Load an issue by URL param and authorize the acting user against the
   issue's own repository. `writeOperation` mirrors authorizeRepository's
   semantics (true = require write/PUSH access). Writes the 403/404/500
   response itself and returns null when access is denied. */
const authorizeIssueRepository = async (req, res, writeOperation) => {
    const { id } = req.params;

    const issue = await Issue.findById(id);

    if (!issue) {
        res.status(404).json({
            message: "Issues not found"
        });
        return null;
    }

    if (!issue.repository) {
        res.status(404).json({
            message: "Issues not found"
        });
        return null;
    }

    const repository = await Repository.findById(
        issue.repository
    );

    if (!repository) {
        res.status(404).json({
            message: "Issues not found"
        });
        return null;
    }

    /* reuse repoAccess' authorization by staging the repository id into
       the params the helper expects, then restoring the original param */
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

export const createIssue = async (req, res) => {
    try {
        /* Issues are a read-level collaborative artifact: anyone who can
           read the repository (public repo = anyone, private repo =
           members with READ) may open an issue. The read gate protects
           private repositories from unauthored writes. */
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const { title, description, label } = req.body;

        if (
            !title ||
            typeof title !== "string" ||
            title.trim() === ""
        ) {
            return res.status(400).json({
                message: "Title is required"
            });
        }

        if (
            !description ||
            typeof description !== "string" ||
            description.trim() === ""
        ) {
            return res.status(400).json({
                message: "Description is required"
            });
        }

        const issue = await Issue.create({
            title: title.trim(),
            description: description.trim(),
            label,
            repository: result.repository._id,
            author: req.user._id
        });

        await createNotification({
            recipient: result.repository.owner,
            actor: req.user._id,
            type: "ISSUE_CREATED",
            repository: result.repository._id,
            issue: issue._id,
            message: buildNotificationMessage(
                "ISSUE_CREATED",
                { title: issue.title }
            )
        });

        await createActivity({
            actor: req.user._id,
            type: "ISSUE_CREATED",
            repository: result.repository._id,
            issue: issue._id,
            metadata: { issueTitle: issue.title }
        });

        res.status(201).json({
            message: "Issue created !!",
            issue
        });
    } catch (err) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

export const getRepositoryIssues = async (req, res) => {
    try {
        const auth = await authorizeRepository(req, res, false);
        if (!auth) return;

        const issues = await Issue.find({
            repository: auth.repository._id
        })
            .populate("author", "userName email")
            .sort({ createdAt: -1 });

        res.status(200).json({ issues });
    } catch (err) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

export const getIssueById = async (req, res) => {
    try {
        const result = await authorizeIssueRepository(
            req,
            res,
            false
        );

        if (!result) {
            return;
        }

        const issue = await Issue.findById(
            result.issue._id
        )
            .populate("author", "userName email");

        res.status(200).json(issue);
    } catch (err) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

export const closeIssue = async (req, res) => {
    try {
        const result = await authorizeIssueRepository(
            req,
            res,
            false
        );

        if (!result) {
            return;
        }

        result.issue.status = "closed";
        await result.issue.save();

        res.status(200).json({
            message: "Issue Closed!"
        });
    } catch (err) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

export const reopenIssue = async (req, res) => {
    try {
        const result = await authorizeIssueRepository(
            req,
            res,
            false
        );

        if (!result) {
            return;
        }

        result.issue.status = "open";
        await result.issue.save();

        res.status(200).json({
            message: "Issue reopened"
        });
    } catch (err) {
        res.status(500).json({
            message: "Server error"
        });
    }
};
