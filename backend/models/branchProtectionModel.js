import mongoose from "mongoose";

const BranchProtectionSchema = new mongoose.Schema(
    {
        repository: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Repository",
            required: true
        },
        branch: {
            type: String,
            required: true,
            trim: true
        },
        enabled: {
            type: Boolean,
            default: true
        },
        requiredApprovals: {
            type: Number,
            default: 1,
            min: 1,
            max: 10
        },
        dismissStaleReviews: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

BranchProtectionSchema.index(
    { repository: 1, branch: 1 },
    { unique: true }
);

const BranchProtection = mongoose.model(
    "BranchProtection",
    BranchProtectionSchema
);

export default BranchProtection;
