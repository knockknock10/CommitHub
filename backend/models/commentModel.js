import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        issue: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Issue",
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Comment = mongoose.model(
    "Comment",
    commentSchema
);

export default Comment;
