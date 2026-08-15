import mongoose from "mongoose";

const TagSchema = new mongoose.Schema(
    {
        repository: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Repository",
            required: true
        },
        name: { type: String, required: true },
        commitId: { type: String, required: true },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

TagSchema.index({ repository: 1, name: 1 }, { unique: true });

const Tag = mongoose.model("Tag", TagSchema);

export default Tag;
