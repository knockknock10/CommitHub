import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    avatar: {
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
    }
}, { timestamps: true });

OrganizationSchema.index({ owner: 1 });

const Organization = mongoose.model("Organization", OrganizationSchema);
export default Organization;