import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
    "ISSUE_CREATED",
    "ISSUE_COMMENTED",
    "PR_CREATED",
    "PR_COMMENTED",
    "PR_REVIEWED",
    "PR_MERGED",
    "PR_CLOSED",
    "PR_REOPENED",
    "MENTION",
    "REPOSITORY_STARRED",
    "RELEASE_PUBLISHED"
];

const NotificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: NOTIFICATION_TYPES,
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
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            default: null
        },
        release: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Release",
            default: null
        },
        read: {
            type: Boolean,
            default: false
        },
        message: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

NotificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model(
    "Notification",
    NotificationSchema
);

export default Notification;
