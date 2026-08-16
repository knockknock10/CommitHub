import mongoose from "mongoose";

export const ACTIVITY_TYPES = [
    "REPOSITORY_CREATED",
    "BRANCH_CREATED",
    "COMMIT_CREATED",
    "ISSUE_CREATED",
    "ISSUE_COMMENTED",
    "PR_CREATED",
    "PR_COMMENTED",
    "PR_REVIEWED",
    "PR_MERGED",
    "PR_CLOSED",
    "PR_REOPENED",
    "TAG_CREATED",
    "RELEASE_PUBLISHED",
    "REPOSITORY_STARRED"
];

const ActivitySchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: ACTIVITY_TYPES,
            required: true
        },
        repository: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Repository",
            required: true
        },
        issue: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Issue",
            default: null
        },
        pullRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PullRequest",
            default: null
        },
        tag: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tag",
            default: null
        },
        release: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Release",
            default: null
        },
        commitId: {
            type: String,
            default: null
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

/* newest-first feed per repository */
ActivitySchema.index({ repository: 1, createdAt: -1 });

/* newest-first feed per actor */
ActivitySchema.index({ actor: 1, createdAt: -1 });

/* global newest-first ordering */
ActivitySchema.index({ createdAt: -1 });

const Activity = mongoose.model(
    "Activity",
    ActivitySchema
);

export default Activity;
