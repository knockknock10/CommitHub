import mongoose from "mongoose";
import Repository from "../models/repoModel.js";

/* shared validate → load → authorize prelude */

export const authorizeRepository = async (req, res, writeOperation) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
            message: "Invalid repository ID"
        });
        return null;
    }

    const repository = await Repository.findById(id);

    if (!repository) {
        res.status(404).json({
            message: "Repository not found"
        });
        return null;
    }

    const isOwner =
        repository.owner.toString() === req.user._id.toString();

    if (
        writeOperation
            ? !isOwner
            : repository.visibility === "private" && !isOwner
    ) {
        res.status(403).json({
            message: "You do not have access to this repository"
        });
        return null;
    }

    return { repository, isOwner };
};
