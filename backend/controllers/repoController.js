import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import Issue from "../models/issueMode.js";
import Comment from "../models/commentModel.js";
import {
    MAX_FILE_SIZE,
    getRepoRoot,
    ensureRepoStorageDir,
    removeRepoStorageDir,
    resolveRepoPath,
    assertRealPathWithin
} from "../utils/repoStorage.js";

/* star repository */
export const starRepository = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner.toString() === req.user._id.toString();

        if (repository.visibility === "private" && !isOwner) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        // raw collection update: mongoose injects updatedAt via timestamps,
        // which would make modifiedCount 1 even when nothing changed
        const result = await User.collection.updateOne(
            { _id: req.user._id },
            { $addToSet: { starRepo: repository._id } }
        );

        if (result.modifiedCount === 1) {
            await Repository.updateOne(
                { _id: repository._id },
                { $inc: { stars: 1 } }
            );
        }

        res.status(200).json({
            stars: result.modifiedCount === 1
                ? repository.stars + 1
                : repository.stars,
            isStarred: true
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

/* unstar repository */
export const unstarRepository = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const result = await User.collection.updateOne(
            { _id: req.user._id },
            { $pull: { starRepo: repository._id } }
        );

        if (result.modifiedCount === 1) {
            await Repository.updateOne(
                { _id: repository._id },
                { $inc: { stars: -1 } }
            );
        }

        res.status(200).json({
            stars: result.modifiedCount === 1
                ? Math.max(0, repository.stars - 1)
                : repository.stars,
            isStarred: false
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
}
/* create repository */
export const createRepository = async (req, res) => {
    try {
        const { name, description, visibility } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({
                message: "Repository name must be a non-empty string"
            });
        }

        if (description !== undefined && typeof description !== "string") {
            return res.status(400).json({
                message: "Description must be a string"
            });
        }

        if (visibility !== undefined && visibility !== "public" && visibility !== "private") {
            return res.status(400).json({
                message: "Visibility must be public or private"
            });
        }

        const trimmedName = name.trim();

        const existingRepo = await Repository.findOne({
            name: trimmedName,
            owner: req.user._id
        });

        if (existingRepo) {
            return res.status(400).json({
                message: "Repository already exists"
            });
        }

        const repository = await Repository.create({
            name: trimmedName,
            description,
            visibility,
            owner: req.user._id,
            branches: ["main"]
        });

        await User.updateOne(
            { _id: req.user._id },
            { $addToSet: { repositories: repository._id } }
        );

        try {
            await ensureRepoStorageDir(req.user._id, repository._id);
        } catch (error) {
            await Repository.findByIdAndDelete(repository._id);

            return res.status(500).json({
                message: "Server error"
            });
        }

        res.status(201).json(repository);
    } catch (error) {
        res.status(500).json({
            message: "Server error"
        });
    }
};

/* get repositories */
// export const getRepositories = async (req, res) => {
//     try {
//         const repositories = await Repository.find({
//             owner: req.user._id
//         }).sort({
//             createdAt: -1
//         });

//         res.status(200).json(repositories);
//     } catch (error) {
//         res.status(500).json({
//             message: error.message
//         });
//     }
// };
export const getRepositories = async (req, res) => {
    try {
        const repositories = await Repository.find({
            owner: req.user._id
        }).sort({
            createdAt: -1
        });

        return res.status(200).json(repositories);

    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
//fetch repo by id
export const getRepositoryById = async (req,res) => {
    try{
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id)
            .populate("owner", "userName email");

        if(!repository){
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner &&
            repository.owner._id.toString() === req.user._id.toString();

        const isStarred = req.user.starRepo
            .some((repoId) =>
                repoId.toString() === repository._id.toString()
            );

        if (repository.visibility === "public" || isOwner) {
            return res.status(200).json({
                ...repository.toObject(),
                isStarred,
                isOwner
            });
        }

        return res.status(403).json({
            message: "You do not have access to this repository"
        });
    }catch(error){
        return res.status(500).json({
            message: "Server error"
        });
    }
}

/* get repository tree */
export const getRepositoryTree = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner.toString() === req.user._id.toString();

        if (repository.visibility === "private" && !isOwner) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        const requestedPath = req.query.path || "";

        const root = getRepoRoot(repository.owner, repository._id);
        const safePath = resolveRepoPath(root, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        let stat;

        try {
            stat = await fs.promises.stat(safePath);
        } catch (error) {
            if (safePath === root) {
                return res.status(200).json({
                    path: requestedPath,
                    entries: []
                });
            }

            return res.status(404).json({
                message: "Path not found"
            });
        }

        try {
            assertRealPathWithin(root, safePath);
        } catch (error) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        if (!stat.isDirectory()) {
            return res.status(400).json({
                message: "Path is not a directory"
            });
        }

        const names = await fs.promises.readdir(safePath);
        const entries = [];

        for (const name of names) {
            if (name === ".CommitHub") {
                continue;
            }

            const entryStat = await fs.promises.stat(path.join(safePath, name));
            const isDirectory = entryStat.isDirectory();

            entries.push({
                name,
                type: isDirectory ? "folder" : "file",
                path: requestedPath ? `${requestedPath}/${name}` : name,
                ...(isDirectory ? {} : { size: entryStat.size })
            });
        }

        entries.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === "folder" ? -1 : 1;
            }

            return a.name.localeCompare(b.name);
        });

        return res.status(200).json({
            path: requestedPath,
            entries
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* get repository file */
export const getRepositoryFile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner.toString() === req.user._id.toString();

        if (repository.visibility === "private" && !isOwner) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        const requestedPath = req.query.path;

        if (typeof requestedPath !== "string" || requestedPath.trim() === "") {
            return res.status(400).json({
                message: "A file path is required"
            });
        }

        const root = getRepoRoot(repository.owner, repository._id);
        const safePath = resolveRepoPath(root, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        let stat;

        try {
            stat = await fs.promises.stat(safePath);
        } catch (error) {
            return res.status(404).json({
                message: "File not found"
            });
        }

        try {
            assertRealPathWithin(root, safePath);
        } catch (error) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        if (stat.isDirectory()) {
            return res.status(400).json({
                message: "Path is a directory"
            });
        }

        if (stat.size > MAX_FILE_SIZE) {
            return res.status(413).json({
                message: "File is too large to view"
            });
        }

        const content = await fs.promises.readFile(safePath, "utf8");

        if (content.includes("\0")) {
            return res.status(400).json({
                message: "Binary file cannot be viewed"
            });
        }

        return res.status(200).json({
            path: requestedPath,
            name: path.basename(safePath),
            content,
            size: stat.size
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* update repository */
export const updateRepository = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner.toString() === req.user._id.toString();

        if (!isOwner) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        const { name, description, visibility } = req.body;

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                return res.status(400).json({
                    message: "Repository name must be a non-empty string"
                });
            }

            const nameTaken = await Repository.findOne({
                name,
                owner: req.user._id,
                _id: { $ne: repository._id }
            });

            if (nameTaken) {
                return res.status(400).json({
                    message: "Repository already exists"
                });
            }

            updates.name = name.trim();
        }

        if (description !== undefined) {
            if (typeof description !== "string") {
                return res.status(400).json({
                    message: "Description must be a string"
                });
            }

            updates.description = description;
        }

        if (visibility !== undefined) {
            if (visibility !== "public" && visibility !== "private") {
                return res.status(400).json({
                    message: "Visibility must be public or private"
                });
            }

            updates.visibility = visibility;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No valid fields to update"
            });
        }

        repository.set(updates);

        await repository.save();

        await repository.populate("owner", "userName email");

        return res.status(200).json(repository);
    }catch(error){
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* delete repository */
export const deleteRepository = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner.toString() === req.user._id.toString();

        if (!isOwner) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        const issues = await Issue.find({
            repository: repository._id
        });

        const issueIds = issues.map((issue) => issue._id);

        await Comment.deleteMany({
            issue: { $in: issueIds }
        });

        await Issue.deleteMany({
            repository: repository._id
        });

        await User.updateMany({}, {
            $pull: {
                starRepo: repository._id,
                repositories: repository._id
            }
        });

        await Repository.findByIdAndDelete(repository._id);

        try {
            await removeRepoStorageDir(repository.owner, repository._id);
        } catch (error) {
            // storage is derived from the document; failure leaves an unreferenced folder
        }

        return res.status(200).json({
            message: "Repository deleted"
        });
    }catch(error){
        return res.status(500).json({
            message: "Server error"
        });
    }
};