import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import crypto from "crypto";
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
import { authorizeRepository } from "../utils/repoAccess.js";
import {
    createNotification,
    buildNotificationMessage
} from "../utils/notificationService.js";
import { createActivity } from "../utils/activityService.js";

const isVersionControlPath = (root, target) => {
    const relative = path.relative(root, target);

    return (
        relative === ".CommitHub" ||
        relative.startsWith(".CommitHub" + path.sep)
    );
};

/* resolve a repository-relative path for a file/directory operation.
   Rejects absolute paths, traversal, the repository root itself, and
   anything inside .CommitHub. */
const resolveManagedPath = (root, requestedPath) => {
    if (typeof requestedPath !== "string" || requestedPath.trim() === "") {
        return null;
    }

    const safePath = resolveRepoPath(root, requestedPath);

    if (!safePath || safePath === root) {
        return null;
    }

    if (isVersionControlPath(root, safePath)) {
        return null;
    }

    return safePath;
};

/* verify that every already-existing path component between the target and
   the repository root resolves inside the repository, so a symlink can never
   redirect a write outside the repository. lstat is used so a dangling
   symlink counts as "existing" and is rejected by the realpath check. */
const assertAncestorsWithinRoot = async (root, target) => {
    let current = target;

    while (current !== root) {
        try {
            await fs.promises.lstat(current);
            break;
        } catch {
            current = path.dirname(current);
        }
    }

    if (current === root) {
        return;
    }

    assertRealPathWithin(root, current);
};

const hashContent = (content) =>
    crypto.createHash("sha1").update(content).digest("hex");

const readTextFile = async (safePath) => {
    const stat = await fs.promises.stat(safePath);

    if (stat.size > MAX_FILE_SIZE) {
        const error = new Error("File is too large to view");
        error.code = "TOO_LARGE";
        throw error;
    }

    const content = await fs.promises.readFile(safePath, "utf8");

    if (content.includes("\0")) {
        const error = new Error("Binary file cannot be viewed");
        error.code = "BINARY_FILE";
        throw error;
    }

    return { content, stat };
};

const validateWriteContent = (content) => {
    if (typeof content !== "string") {
        const error = new Error("File content must be a string");
        error.code = "CONTENT_TYPE";
        throw error;
    }

    if (Buffer.byteLength(content, "utf8") > MAX_FILE_SIZE) {
        const error = new Error("File is too large");
        error.code = "TOO_LARGE";
        throw error;
    }

    if (content.includes("\0")) {
        const error = new Error("Binary file content is not supported");
        error.code = "BINARY_FILE";
        throw error;
    }

    return content;
};

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

            await createNotification({
                recipient: repository.owner,
                actor: req.user._id,
                type: "REPOSITORY_STARRED",
                repository: repository._id,
                message: buildNotificationMessage(
                    "REPOSITORY_STARRED"
                )
            });

            await createActivity({
                actor: req.user._id,
                type: "REPOSITORY_STARRED",
                repository: repository._id
            });
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

        await createActivity({
            actor: req.user._id,
            type: "REPOSITORY_CREATED",
            repository: repository._id
        });

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

        if (isVersionControlPath(root, safePath)) {
            return res.status(404).json({
                message: "Path not found"
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
                updatedAt: entryStat.mtimeMs,
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

        if (isVersionControlPath(root, safePath)) {
            return res.status(404).json({
                message: "File not found"
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

        let content;

        try {
            ({ content } = await readTextFile(safePath));
        } catch (error) {
            if (error.code === "TOO_LARGE") {
                return res.status(413).json({
                    message: "File is too large to view"
                });
            }

            if (error.code === "BINARY_FILE") {
                return res.status(400).json({
                    message: "Binary file cannot be viewed"
                });
            }

            throw error;
        }

        return res.status(200).json({
            path: requestedPath,
            name: path.basename(safePath),
            content,
            size: stat.size,
            updatedAt: stat.mtimeMs,
            hash: hashContent(content)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* create file */
export const createRepositoryFile = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const requestedPath =
            typeof req.body?.path === "string"
                ? req.body.path.trim()
                : "";

        if (requestedPath === "") {
            return res.status(400).json({
                message: "A file path is required"
            });
        }

        let content;

        try {
            content = validateWriteContent(req.body?.content);
        } catch (error) {
            if (error.code === "CONTENT_TYPE") {
                return res.status(400).json({
                    message: "File content must be a string"
                });
            }

            if (error.code === "BINARY_FILE") {
                return res.status(400).json({
                    message: "Binary file content is not supported"
                });
            }

            if (error.code === "TOO_LARGE") {
                return res.status(413).json({
                    message: "File is too large"
                });
            }

            throw error;
        }

        const root = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const safePath = resolveManagedPath(root, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        await ensureRepoStorageDir(
            result.repository.owner,
            result.repository._id
        );

        try {
            await fs.promises.lstat(safePath);

            return res.status(400).json({
                message: "File already exists"
            });
        } catch (error) {
            /* path is free — continue */
        }

        try {
            await assertAncestorsWithinRoot(root, safePath);
        } catch (error) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        await fs.promises.mkdir(
            path.dirname(safePath),
            { recursive: true }
        );
        await fs.promises.writeFile(safePath, content);

        const stat = await fs.promises.stat(safePath);

        return res.status(201).json({
            path: requestedPath,
            name: path.basename(safePath),
            size: stat.size,
            updatedAt: stat.mtimeMs
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* edit file */
export const updateRepositoryFile = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const requestedPath =
            typeof req.body?.path === "string"
                ? req.body.path.trim()
                : "";

        if (requestedPath === "") {
            return res.status(400).json({
                message: "A file path is required"
            });
        }

        let content;

        try {
            content = validateWriteContent(req.body?.content);
        } catch (error) {
            if (error.code === "CONTENT_TYPE") {
                return res.status(400).json({
                    message: "File content must be a string"
                });
            }

            if (error.code === "BINARY_FILE") {
                return res.status(400).json({
                    message: "Binary file content is not supported"
                });
            }

            if (error.code === "TOO_LARGE") {
                return res.status(413).json({
                    message: "File is too large"
                });
            }

            throw error;
        }

        const root = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const safePath = resolveManagedPath(root, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        await ensureRepoStorageDir(
            result.repository.owner,
            result.repository._id
        );

        let stat;

        try {
            stat = await fs.promises.stat(safePath);
        } catch (error) {
            return res.status(404).json({
                message: "File not found"
            });
        }

        if (stat.isDirectory()) {
            return res.status(400).json({
                message: "Path is a directory"
            });
        }

        try {
            assertRealPathWithin(root, safePath);
        } catch (error) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        const expectedHash =
            typeof req.body?.expectedHash === "string"
                ? req.body.expectedHash
                : null;

        if (expectedHash) {
            const currentContent = await fs.promises.readFile(
                safePath,
                "utf8"
            );

            if (hashContent(currentContent) !== expectedHash) {
                return res.status(409).json({
                    message: "File has been modified since it was loaded"
                });
            }
        }

        await fs.promises.writeFile(safePath, content);

        const updatedStat = await fs.promises.stat(safePath);

        return res.status(200).json({
            path: requestedPath,
            name: path.basename(safePath),
            size: updatedStat.size,
            updatedAt: updatedStat.mtimeMs,
            hash: hashContent(content)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* delete file */
export const deleteRepositoryFile = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const requestedPath = req.query.path;

        if (typeof requestedPath !== "string" || requestedPath.trim() === "") {
            return res.status(400).json({
                message: "A file path is required"
            });
        }

        const root = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const safePath = resolveManagedPath(root, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        await ensureRepoStorageDir(
            result.repository.owner,
            result.repository._id
        );

        let stat;

        try {
            stat = await fs.promises.stat(safePath);
        } catch (error) {
            return res.status(404).json({
                message: "File not found"
            });
        }

        if (stat.isDirectory()) {
            return res.status(400).json({
                message: "Path is a directory"
            });
        }

        try {
            assertRealPathWithin(root, safePath);
        } catch (error) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        await fs.promises.rm(safePath, { force: true });

        return res.status(200).json({
            message: "File deleted",
            path: requestedPath
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* create directory */
export const createRepositoryDirectory = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const requestedPath =
            typeof req.body?.path === "string"
                ? req.body.path.trim()
                : "";

        if (requestedPath === "") {
            return res.status(400).json({
                message: "A directory path is required"
            });
        }

        const root = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const safePath = resolveManagedPath(root, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        await ensureRepoStorageDir(
            result.repository.owner,
            result.repository._id
        );

        try {
            await fs.promises.lstat(safePath);

            return res.status(400).json({
                message: "Directory already exists"
            });
        } catch (error) {
            /* path is free — continue */
        }

        const parent = path.dirname(safePath);
        let parentStat;

        try {
            parentStat = await fs.promises.stat(parent);
        } catch (error) {
            return res.status(400).json({
                message: "Parent directory does not exist"
            });
        }

        if (!parentStat.isDirectory()) {
            return res.status(400).json({
                message: "Parent path is not a directory"
            });
        }

        try {
            assertRealPathWithin(root, parent);
        } catch (error) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        await fs.promises.mkdir(safePath);

        return res.status(201).json({
            path: requestedPath,
            name: path.basename(safePath)
        });
    } catch (error) {
        if (error.code === "EEXIST") {
            return res.status(400).json({
                message: "Directory already exists"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* delete directory (empty directories only) */
export const deleteRepositoryDirectory = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const requestedPath = req.query.path;

        if (typeof requestedPath !== "string" || requestedPath.trim() === "") {
            return res.status(400).json({
                message: "A directory path is required"
            });
        }

        const root = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const safePath = resolveManagedPath(root, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        await ensureRepoStorageDir(
            result.repository.owner,
            result.repository._id
        );

        let stat;

        try {
            stat = await fs.promises.stat(safePath);
        } catch (error) {
            return res.status(404).json({
                message: "Directory not found"
            });
        }

        if (!stat.isDirectory()) {
            return res.status(400).json({
                message: "Path is not a directory"
            });
        }

        try {
            assertRealPathWithin(root, safePath);
        } catch (error) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        const names = await fs.promises.readdir(safePath);

        if (names.length > 0) {
            return res.status(400).json({
                message: "Directory is not empty"
            });
        }

        await fs.promises.rmdir(safePath);

        return res.status(200).json({
            message: "Directory deleted",
            path: requestedPath
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