import Issue from "../models/issueMode.js";
import Repository from "../models/repoModel.js"
export const createIssue = async (req, res) => {
    try {

        const repository = await Repository.findOne({
            _id: req.params.id,
            owner: req.user._id
        })
        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }
        const { title, description, label } = req.body;
        if (!title || !description) {
            return res.status(400).json({
                message: "Title and description are required"
            })
        }
        const issue = await Issue.create({
            title,
            description,
            label,
            repository: repository._id,
            author: req.user._id
        })
        res.status(201).json({
            message: "Issue created !!",
            issue
        })

    } catch (err) {
        res.status(400).json({
            message: `Issue creation failed ${err.message}`
        })
    }
}

export const getRepositoryIssues = async (req, res) => {
    try {
        const repository = await Repository.findOne({
            _id: req.params.id,
            owner: req.user._id
        })
        if (!repository) {
            return res.status(404).json({
                message: "Repository Not Found!"
            })
        }
        const issues = await Issue.find({
            repository: req.params.id
        }).populate(
            "author",
            "userName email"
        )
            .sort({
                createdAt: -1
            })
        res.status(200).json({ issues });
    } catch (err) {
        res.status(404).json({
            message: `Failed to fetch Repository Issues ${err.message}`
        })
    }
}

export const getIssueById = async (req, res) => {
    try {
        const issue = await Issue.findById(
            req.params.id
        )
            .populate(
                "author",
                "userName email"
            )
        if (!issue) {
            return res.status(404).json({
                message: "Issues not found"
            })
        }
        res.status(200).json(issue);
    } catch (err) {
        return res.status(500).json({
            message: `failed to fetch issue ${err.message}`
        })
    }
}

export const closeIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(
            req.params.id
        )
        if (!issue) {
            return res.status(404).json({
                message: `Issues not closed ${err.message}`
            })
        }
        issue.status = "closed";
        await issue.save();
        res.status(200).json({
            message: `Issue Closed!`
        })
    } catch (err) {
        res.status(500).json({
            message: `Failed to close issue ${err.message}`
        })
    }
}

export const reopenIssue = async (req, res) => {
    try {
        const issue = await Issue.findById(
            req.params.id
        )
        if (!issue) {
            return res.status(404).json({
                message: `Issue not found`
            })
        }
        issue.status = "open";
        await issue.save();
        res.status(200).json({
            message: `Issue reponed`
        })
    } catch (err) {
        res.status(500).json({
            message: `Failed to reopen ${err.message}`
        })
    }
}