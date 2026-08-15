import mongoose from "mongoose";

const ReleaseSchema = new mongoose.Schema(
    {
        repository: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Repository",
            required: true
        },
        tagName: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, default: "" },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft"
        },
        publishedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

const Release = mongoose.model("Release", ReleaseSchema);

export default Release;
