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
        required: false
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: false
    },
    upstreamRepository: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Repository",
        default: null
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
    ],
    prCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

/* owner or organization + upstreamRepository: enumerate a repository's direct forks */
RepoSchema.index({ owner: 1, upstreamRepository: 1, createdAt: -1 });
RepoSchema.index({ organization: 1, upstreamRepository: 1, createdAt: -1 });



const Repository = mongoose.model("Repository", RepoSchema);

export default Repository;