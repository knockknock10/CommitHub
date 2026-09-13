import mongoose from "mongoose";

export const ORG_ROLES = ["OWNER", "ADMIN", "MEMBER"];

const OrganizationMembershipSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    role: {
        type: String,
        enum: ORG_ROLES,
        required: true
    }
}, { timestamps: true });

OrganizationMembershipSchema.index({ organization: 1, user: 1 }, { unique: true });
OrganizationMembershipSchema.index({ user: 1, organization: 1 });

const OrganizationMembership = mongoose.model("OrganizationMembership", OrganizationMembershipSchema);
export default OrganizationMembership;