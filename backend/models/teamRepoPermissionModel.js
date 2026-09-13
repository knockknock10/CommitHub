import mongoose from "mongoose";

import { COLLABORATOR_ROLES } from "./collaboratorModel.js";

const TeamRepoPermissionSchema = new mongoose.Schema({
    repository: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Repository",
        required: true
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true
    },
    role: {
        type: String,
        enum: COLLABORATOR_ROLES,
        required: true
    }
}, { timestamps: true });

TeamRepoPermissionSchema.index({ repository: 1, team: 1 }, { unique: true });

const TeamRepoPermission = mongoose.model("TeamRepoPermission", TeamRepoPermissionSchema);
export default TeamRepoPermission;