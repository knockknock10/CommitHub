import mongoose from "mongoose";

const RepoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    visibility: {
        type: String,
        enum: ["public", "private"],
        default: "public"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    stars: {
        type: Number,
        default: 0
    },
    forks: {
        type: Number,
        default: 0
    },
    branches: [
        {
            type: String
        }
    ]
}, {
    timestamps: true
});

const Repository = mongoose.model("Repository", RepoSchema);

export default Repository;