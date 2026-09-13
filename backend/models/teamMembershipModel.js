import mongoose from "mongoose";

export const TEAM_ROLES = ["maintainer", "member"];

const TeamMembershipSchema = new mongoose.Schema({
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    role: {
        type: String,
        enum: TEAM_ROLES,
        default: "member"
    }
}, { timestamps: true });

TeamMembershipSchema.index({ team: 1, user: 1 }, { unique: true });

const TeamMembership = mongoose.model("TeamMembership", TeamMembershipSchema);
export default TeamMembership;