import mongoose from "mongoose";

export const COLLABORATOR_ROLES = ["owner", "maintainer", "developer", "reporter", "read_only"];

const CollaboratorSchema = new mongoose.Schema({
    repository: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: COLLABORATOR_ROLES, required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

CollaboratorSchema.index({ repository: 1, user: 1 }, { unique: true });
CollaboratorSchema.index({ user: 1, repository: 1 });

const Collaborator = mongoose.model("Collaborator", CollaboratorSchema);
export default Collaborator;
