import mongoose from "mongoose";

const { Schema } = mongoose;

const ReviewCommentSchema = new Schema(
    {
        pullRequest: {
            type: Schema.Types.ObjectId,
            ref: "PullRequest",
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
        commit: {
            type: String,
            required: true
        },
        filePath: {
            type: String,
            required: true
        },
        line: {
            type: Number,
            default: null
        },
        side: {
            type: String,
            enum: ["LEFT", "RIGHT", null],
            default: "RIGHT"
        },
        body: {
            type: String,
            required: true
        },
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "ReviewComment",
            default: null
        },
        review: {
            type: Schema.Types.ObjectId,
            default: null
        },
        resolved: {
            type: Boolean,
            default: false
        },
        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        resolvedAt: {
            type: Date,
            default: null
        },
        outdated: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

ReviewCommentSchema.index(
    { pullRequest: 1, filePath: 1, line: 1 }
);

ReviewCommentSchema.index(
    { pullRequest: 1, resolved: 1, createdAt: 1 }
);

ReviewCommentSchema.index(
    { pullRequest: 1, parentComment: 1 }
);

ReviewCommentSchema.index(
    { repository: 1, author: 1, createdAt: -1 }
);

const ReviewComment = mongoose.model(
    "ReviewComment",
    ReviewCommentSchema
);

export default ReviewComment;
