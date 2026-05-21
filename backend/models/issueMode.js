import mongoose from "mongoose";
const { Schema } = mongoose;

const IssueSchema = new Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["open", "closed"],
            default: "open"
        },
        repository: {
            type: Schema.Types.ObjectId,
            ref: "Repository",
            required: true
        },
        label: {
            type: String,
            enum: [
                "bug",
                "documentation",
                "duplicate",
                "enhancement",
                "good first issue",
                "help wanted",
                "question"
            ],
            default: "bug"
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

const Issue = mongoose.model(
    "Issue",
    IssueSchema
);

export default Issue;