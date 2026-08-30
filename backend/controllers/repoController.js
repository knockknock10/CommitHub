import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import Issue from "../models/issueMode.js";
import Comment from "../models/commentModel.js";
import Collaborator from "../models/collaboratorModel.js";
import {
    MAX_FILE_SIZE,
    getRepoRoot,
    ensureRepoStorageDir,
    removeRepoStorageDir,
    resolveRepoPath,
    assertRealPathWithin
} from "../utils/repoStorage.js";
import { authorizeRepository, authorizeRepositoryPermission } from "../utils/repoAccess.js";
import { getUserRepositoryRole, roleHasPermission, PERMISSIONS } from "../utils/permissionService.js";
import {
    createNotification,
    buildNotificationMessage
} from "../utils/notificationService.js";
import { createActivity } from "../utils/activityService.js";
import {
    getBranchCommitId,
    getTreeAtSnapshot,
    getSnapshot,
    getFileAtSnapshot,
    getRawFileAtSnapshot,
    getFileHistoryForPath,
    ensureVersionControl,
    getCommitDiff,
    getCommitsBetween,
    createCommit as performCommit,
    getCommit as readCommit
} from "../utils/repoVersion.js";
import { findCommonAncestor, computeAheadBehind } from "../utils/diffMerge.js";

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

        if (isOwner) {
            return res.status(200).json({
                ...repository.toObject(),
                isStarred,
                isOwner,
                userRole: "owner"
            });
        }

        if (repository.visibility === "public") {
            const role = await getUserRepositoryRole(req.user._id, repository._id);
            return res.status(200).json({
                ...repository.toObject(),
                isStarred,
                isOwner: false,
                userRole: role || null
            });
        }

        const role = await getUserRepositoryRole(req.user._id, repository._id);
        if (role) {
            return res.status(200).json({
                ...repository.toObject(),
                isStarred,
                isOwner: false,
                userRole: role
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
            const role = await getUserRepositoryRole(req.user._id, repository._id);
            if (!role || !roleHasPermission(role, PERMISSIONS.MANAGE_SETTINGS)) {
                return res.status(403).json({
                    message: "You do not have access to this repository"
                });
            }
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
            const role = await getUserRepositoryRole(req.user._id, repository._id);
            if (!role || !roleHasPermission(role, PERMISSIONS.DELETE)) {
                return res.status(403).json({
                    message: "You do not have access to this repository"
                });
            }
        }

        const issues = await Issue.find({
            repository: repository._id
        });

        const issueIds = issues.map((issue) => issue._id);

        await Collaborator.deleteMany({ repository: repository._id });

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

const MIME_TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".jsx": "text/javascript",
    ".ts": "text/javascript",
    ".tsx": "text/javascript",
    ".json": "application/json",
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".xml": "application/xml",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".tar": "application/x-tar",
    ".wasm": "application/wasm",
    ".py": "text/x-python",
    ".java": "text/x-java",
    ".rb": "text/x-ruby",
    ".go": "text/x-go",
    ".rs": "text/x-rust",
    ".c": "text/x-c",
    ".cpp": "text/x-c++",
    ".h": "text/x-c",
    ".sh": "text/x-shellscript",
    ".yml": "text/yaml",
    ".yaml": "text/yaml",
    ".toml": "text/plain",
    ".sql": "text/x-sql",
    ".env": "text/plain",
    ".gitignore": "text/plain",
    ".dockerignore": "text/plain",
    ".lock": "text/plain"
};

const getMimeType = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || "application/octet-stream";
};

const DEFAULT_BRANCH_FALLBACK = "main";

const resolveBranchName = (vcRoot, requestedBranch) => {
    if (typeof requestedBranch === "string" && requestedBranch.trim() !== "") {
        return requestedBranch.trim();
    }
    return DEFAULT_BRANCH_FALLBACK;
};

/* branch-aware tree: resolve branch → HEAD commit → snapshot → directory */
export const getBranchTree = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const vcRoot = await ensureVersionControl(repoRoot);
        const branchName = resolveBranchName(vcRoot, req.query.branch);

        let commitId;

        try {
            commitId = await getBranchCommitId(repoRoot, branchName);
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(404).json({
                    message: `Branch "${branchName}" does not exist`
                });
            }
            throw error;
        }

        const requestedPath =
            typeof req.query.path === "string"
                ? req.query.path.trim()
                : "";

        const root = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        if (requestedPath !== "") {
            const safePath = resolveRepoPath(root, requestedPath);

            if (!safePath) {
                return res.status(400).json({
                    message: "Invalid path"
                });
            }

            if (safePath === root) {
                return res.status(400).json({
                    message: "Invalid path"
                });
            }
        }

        if (!commitId) {
            return res.status(200).json({
                branch: branchName,
                commitId: null,
                path: requestedPath,
                entries: []
            });
        }

        const entries = await getTreeAtSnapshot(
            vcRoot,
            commitId,
            requestedPath
        );

        if (requestedPath !== "") {
            const snapshot = await getSnapshot(vcRoot, commitId);
            const snapshotFile = path.join(snapshot.root, requestedPath);
            let stat;

            try {
                stat = await fs.promises.stat(snapshotFile);
            } catch {
                return res.status(404).json({
                    message: "Path not found"
                });
            }

            if (!stat.isDirectory()) {
                return res.status(400).json({
                    message: "Path is not a directory"
                });
            }
        }

        const commit = await readCommit(repoRoot, commitId);

        return res.status(200).json({
            branch: branchName,
            commitId,
            commitMessage: commit?.message || "",
            commitAuthor: commit?.author || null,
            commitTimestamp: commit?.timestamp || null,
            path: requestedPath,
            entries
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* branch-aware blob: resolve branch → HEAD commit → snapshot → file content */
export const getBranchBlob = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const vcRoot = await ensureVersionControl(repoRoot);
        const branchName = resolveBranchName(vcRoot, req.query.branch);

        let commitId;

        try {
            commitId = await getBranchCommitId(repoRoot, branchName);
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(404).json({
                    message: `Branch "${branchName}" does not exist`
                });
            }
            throw error;
        }

        const requestedPath =
            typeof req.query.path === "string"
                ? req.query.path.trim()
                : "";

        if (requestedPath === "") {
            return res.status(400).json({
                message: "A file path is required"
            });
        }

        const root = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const safePath = resolveRepoPath(root, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        if (safePath === root) {
            return res.status(400).json({
                message: "Path is a directory"
            });
        }

        if (!commitId) {
            return res.status(404).json({
                message: "No commits on this branch"
            });
        }

        const file = await getFileAtSnapshot(vcRoot, commitId, requestedPath);

        if (!file) {
            return res.status(404).json({
                message: "File not found"
            });
        }

        if (file.type === "directory") {
            return res.status(400).json({
                message: "Path is a directory"
            });
        }

        const commit = await readCommit(repoRoot, commitId);

        if (file.tooLarge) {
            return res.status(200).json({
                branch: branchName,
                commitId,
                commitMessage: commit?.message || "",
                commitAuthor: commit?.author || null,
                commitTimestamp: commit?.timestamp || null,
                path: requestedPath,
                name: path.basename(requestedPath),
                size: file.size,
                tooLarge: true
            });
        }

        if (file.binary) {
            return res.status(200).json({
                branch: branchName,
                commitId,
                commitMessage: commit?.message || "",
                commitAuthor: commit?.author || null,
                commitTimestamp: commit?.timestamp || null,
                path: requestedPath,
                name: path.basename(requestedPath),
                size: file.size,
                binary: true
            });
        }

        return res.status(200).json({
            branch: branchName,
            commitId,
            commitMessage: commit?.message || "",
            commitAuthor: commit?.author || null,
            commitTimestamp: commit?.timestamp || null,
            path: requestedPath,
            name: path.basename(requestedPath),
            content: file.content,
            size: file.size,
            hash: file.hash
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* raw file: serve raw file bytes with appropriate headers */
export const getRawFile = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const vcRoot = await ensureVersionControl(repoRoot);
        const branchName = resolveBranchName(vcRoot, req.query.branch);

        let commitId;

        try {
            commitId = await getBranchCommitId(repoRoot, branchName);
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(404).json({
                    message: `Branch "${branchName}" does not exist`
                });
            }
            throw error;
        }

        const requestedPath =
            typeof req.query.path === "string"
                ? req.query.path.trim()
                : "";

        if (requestedPath === "") {
            return res.status(400).json({
                message: "A file path is required"
            });
        }

        const root = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const safePath = resolveRepoPath(root, requestedPath);

        if (!safePath || safePath === root) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        if (!commitId) {
            return res.status(404).json({
                message: "No commits on this branch"
            });
        }

        const raw = await getRawFileAtSnapshot(
            vcRoot,
            commitId,
            requestedPath
        );

        if (!raw) {
            return res.status(404).json({
                message: "File not found"
            });
        }

        const mimeType = getMimeType(requestedPath);

        res.setHeader("Content-Type", mimeType);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${raw.name}"`
        );
        res.setHeader("Content-Length", raw.size);

        return res.status(200).send(raw.buffer);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* file history: commits that touched a specific file */
export const getFileCommitHistory = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const requestedPath =
            typeof req.query.path === "string"
                ? req.query.path.trim()
                : "";

        if (requestedPath === "") {
            return res.status(400).json({
                message: "A file path is required"
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const limitValue =
            typeof req.query.limit === "string"
                ? Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100)
                : 50;

        const commits = await getFileHistoryForPath(
            repoRoot,
            requestedPath,
            { limit: limitValue }
        );

        return res.status(200).json({
            path: requestedPath,
            commits: commits.map((c) => ({
                id: c.id,
                message: c.message,
                author: c.author,
                timestamp: c.timestamp,
                changeType: c.files?.[0]?.status || null
            }))
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* create file through the commit system */
export const createBranchFile = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const vcRoot = await ensureVersionControl(repoRoot);
        const branchName = resolveBranchName(vcRoot, req.body?.branch);

        let commitId;

        try {
            commitId = await getBranchCommitId(repoRoot, branchName);
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(404).json({
                    message: `Branch "${branchName}" does not exist`
                });
            }
            throw error;
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

        const safePath = resolveManagedPath(repoRoot, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
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

        const commitMessage =
            typeof req.body?.commitMessage === "string"
                ? req.body.commitMessage.trim()
                : "";

        if (commitMessage === "") {
            return res.status(400).json({
                message: "Commit message is required"
            });
        }

        if (commitMessage.length > 200) {
            return res.status(400).json({
                message: "Commit message must be 200 characters or fewer"
            });
        }

        const expectedHead =
            typeof req.body?.expectedHead === "string"
                ? req.body.expectedHead.trim()
                : null;

        if (expectedHead && commitId !== expectedHead) {
            return res.status(409).json({
                message: "Repository changed since you started editing"
            });
        }

        try {
            await fs.promises.access(safePath);
            return res.status(400).json({
                message: "File already exists"
            });
        } catch {
            /* path is free */
        }

        await fs.promises.mkdir(
            path.dirname(safePath),
            { recursive: true }
        );
        await fs.promises.writeFile(safePath, content);

        try {
            const commit = await performCommit(repoRoot, {
                message: commitMessage,
                author: {
                    name: req.user.userName,
                    email: req.user.email
                }
            });

            await createActivity({
                actor: req.user._id,
                type: "COMMIT_CREATED",
                repository: result.repository._id,
                commitId: commit.id,
                metadata: { commitMessage: commit.message }
            });

            const stat = await fs.promises.stat(safePath);

            return res.status(201).json({
                commit,
                file: {
                    path: requestedPath,
                    name: path.basename(safePath),
                    size: stat.size
                }
            });
        } catch (error) {
            await fs.promises.rm(safePath, { force: true });
            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* edit file through the commit system */
export const editBranchFile = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const vcRoot = await ensureVersionControl(repoRoot);
        const branchName = resolveBranchName(vcRoot, req.body?.branch);

        let commitId;

        try {
            commitId = await getBranchCommitId(repoRoot, branchName);
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(404).json({
                    message: `Branch "${branchName}" does not exist`
                });
            }
            throw error;
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

        const safePath = resolveManagedPath(repoRoot, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
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

        const commitMessage =
            typeof req.body?.commitMessage === "string"
                ? req.body.commitMessage.trim()
                : "";

        if (commitMessage === "") {
            return res.status(400).json({
                message: "Commit message is required"
            });
        }

        if (commitMessage.length > 200) {
            return res.status(400).json({
                message: "Commit message must be 200 characters or fewer"
            });
        }

        const expectedHead =
            typeof req.body?.expectedHead === "string"
                ? req.body.expectedHead.trim()
                : null;

        if (expectedHead && commitId !== expectedHead) {
            return res.status(409).json({
                message: "Repository changed since you started editing"
            });
        }

        let stat;

        try {
            stat = await fs.promises.stat(safePath);
        } catch {
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
            assertRealPathWithin(repoRoot, safePath);
        } catch {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        const previousContent = await fs.promises.readFile(safePath, "utf8");
        await fs.promises.writeFile(safePath, content);

        try {
            const commit = await performCommit(repoRoot, {
                message: commitMessage,
                author: {
                    name: req.user.userName,
                    email: req.user.email
                }
            });

            await createActivity({
                actor: req.user._id,
                type: "COMMIT_CREATED",
                repository: result.repository._id,
                commitId: commit.id,
                metadata: { commitMessage: commit.message }
            });

            const updatedStat = await fs.promises.stat(safePath);

            return res.status(200).json({
                commit,
                file: {
                    path: requestedPath,
                    name: path.basename(safePath),
                    size: updatedStat.size,
                    hash: crypto.createHash("sha1")
                        .update(content)
                        .digest("hex")
                }
            });
        } catch (error) {
            await fs.promises.writeFile(safePath, previousContent);
            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* delete file through the commit system */
export const deleteBranchFile = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );
        const vcRoot = await ensureVersionControl(repoRoot);

        const body = req.body || {};
        const branchName = resolveBranchName(vcRoot, body.branch);

        let commitId;

        try {
            commitId = await getBranchCommitId(repoRoot, branchName);
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(404).json({
                    message: `Branch "${branchName}" does not exist`
                });
            }
            throw error;
        }

        const requestedPath =
            typeof body.path === "string"
                ? body.path.trim()
                : "";

        if (requestedPath === "") {
            return res.status(400).json({
                message: "A file path is required"
            });
        }

        const safePath = resolveManagedPath(repoRoot, requestedPath);

        if (!safePath) {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        let stat;

        try {
            stat = await fs.promises.stat(safePath);
        } catch {
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
            assertRealPathWithin(repoRoot, safePath);
        } catch {
            return res.status(400).json({
                message: "Invalid path"
            });
        }

        const commitMessage =
            typeof body.commitMessage === "string"
                ? body.commitMessage.trim()
                : "";

        if (commitMessage === "") {
            return res.status(400).json({
                message: "Commit message is required"
            });
        }

        if (commitMessage.length > 200) {
            return res.status(400).json({
                message: "Commit message must be 200 characters or fewer"
            });
        }

        const expectedHead =
            typeof body.expectedHead === "string"
                ? body.expectedHead.trim()
                : null;

        if (expectedHead && commitId !== expectedHead) {
            return res.status(409).json({
                message: "Repository changed since you started editing"
            });
        }

        const previousContent = await fs.promises.readFile(safePath);
        await fs.promises.rm(safePath, { force: true });

        try {
            const commit = await performCommit(repoRoot, {
                message: commitMessage,
                author: {
                    name: req.user.userName,
                    email: req.user.email
                }
            });

            await createActivity({
                actor: req.user._id,
                type: "COMMIT_CREATED",
                repository: result.repository._id,
                commitId: commit.id,
                metadata: { commitMessage: commit.message }
            });

            return res.status(200).json({
                commit,
                file: {
                    path: requestedPath
                }
            });
        } catch (error) {
            await fs.promises.mkdir(
                path.dirname(safePath),
                { recursive: true }
            );
            await fs.promises.writeFile(safePath, previousContent);
            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
export const compareBranches = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const { base, head } = req.query;

        if (!base || typeof base !== "string") {
            return res.status(400).json({
                message: "A base branch is required"
            });
        }

        if (!head || typeof head !== "string") {
            return res.status(400).json({
                message: "A head branch is required"
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        let sourceCommitId = null;
        let targetCommitId = null;

        try {
            sourceCommitId = await getBranchCommitId(repoRoot, head);
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(400).json({
                    message: `Branch "${head}" does not exist`
                });
            }
            if (error.code === "INVALID_BRANCH_NAME") {
                return res.status(400).json({
                    message: error.message
                });
            }
            throw error;
        }

        try {
            targetCommitId = await getBranchCommitId(repoRoot, base);
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(400).json({
                    message: `Branch "${base}" does not exist`
                });
            }
            if (error.code === "INVALID_BRANCH_NAME") {
                return res.status(400).json({
                    message: error.message
                });
            }
            throw error;
        }

        if (sourceCommitId === targetCommitId) {
            const diff = await getCommitDiff(
                repoRoot,
                targetCommitId,
                sourceCommitId
            );

            return res.status(200).json({
                base: { branch: base, commitId: targetCommitId },
                head: { branch: head, commitId: sourceCommitId },
                status: "identical",
                commonAncestor: sourceCommitId,
                ahead: 0,
                behind: 0,
                commitsAhead: [],
                commitsBehind: [],
                diff,
                mergeable: true
            });
        }

        const { ancestorId, isDirectAncestor } = await findCommonAncestor(
            repoRoot,
            targetCommitId,
            sourceCommitId
        );

        const [aheadResult, behindResult] = await Promise.all([
            computeAheadBehind(repoRoot, targetCommitId, sourceCommitId, ancestorId),
            computeAheadBehind(repoRoot, sourceCommitId, targetCommitId, ancestorId)
        ]);

        let status;

        if (isDirectAncestor) {
            status = "ahead";
        } else if (aheadResult.ahead > 0 && behindResult.ahead > 0) {
            status = "diverged";
        } else if (aheadResult.ahead > 0) {
            status = "ahead";
        } else {
            status = "behind";
        }

        const [diff, commitsAhead, commitsBehind] = await Promise.all([
            getCommitDiff(repoRoot, targetCommitId, sourceCommitId),
            getCommitsBetween(repoRoot, ancestorId || targetCommitId, sourceCommitId),
            getCommitsBetween(repoRoot, ancestorId || sourceCommitId, targetCommitId)
        ]);

        return res.status(200).json({
            base: { branch: base, commitId: targetCommitId },
            head: { branch: head, commitId: sourceCommitId },
            status,
            commonAncestor: ancestorId,
            ahead: aheadResult.ahead,
            behind: behindResult.ahead,
            commitsAhead,
            commitsBehind,
            diff,
            mergeable: !aheadResult.ahead || status === "ahead"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
