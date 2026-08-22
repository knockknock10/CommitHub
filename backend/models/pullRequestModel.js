import mongoose from "mongoose";

const { Schema } = mongoose;

const ReviewSchema = new Schema(
    {
        reviewer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        state: {
            type: String,
            enum: ["approved", "changes_requested", "commented"],
            required: true
        },
        comment: {
            type: String,
            default: ""
        },
        reviewedCommit: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const PullRequestCommentSchema = new Schema(
    {
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        content: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const PullRequestSchema = new Schema(
    {
        number: {
            type: Number,
            required: true
        },
        repository: {
            type: Schema.Types.ObjectId,
            ref: "Repository",
            required: true
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        sourceBranch: {
            type: String,
            required: true
        },
        targetBranch: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["open", "closed", "merged"],
            default: "open"
        },
        reviews: {
            type: [ReviewSchema],
            default: []
        },
        comments: {
            type: [PullRequestCommentSchema],
            default: []
        },
        mergedAt: {
            type: Date,
            default: null
        },
        mergedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        mergeSourceCommitId: {
            type: String,
            default: null
        },
        mergeCommitId: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

PullRequestSchema.index(
    { repository: 1, number: 1 },
    { unique: true }
);

PullRequestSchema.index(
    { repository: 1, status: 1, number: -1 }
);

PullRequestSchema.index(
    {
        repository: 1,
        sourceBranch: 1,
        targetBranch: 1
    },
    {
        unique: true,
        partialFilterExpression: { status: "open" }
    }
);

const PullRequest = mongoose.model(
    "PullRequest",
    PullRequestSchema
);

export default PullRequest;
