import fs from "fs";
import path from "path";

const MAX_FILE_SIZE = 1024 * 1024;

const getStorageRoot = () =>
    process.env.REPO_STORAGE_ROOT ||
    path.join(process.cwd(), "repo-storage");

const getRepoRoot = (ownerId, repoId) =>
    path.join(
        getStorageRoot(),
        ownerId.toString(),
        repoId.toString()
    );

const ensureRepoStorageDir = (ownerId, repoId) =>
    fs.promises.mkdir(
        getRepoRoot(ownerId, repoId),
        { recursive: true }
    );

const removeRepoStorageDir = (ownerId, repoId) =>
    fs.promises.rm(
        getRepoRoot(ownerId, repoId),
        { recursive: true, force: true }
    );

const resolveRepoPath = (root, requestedPath) => {
    if (
        typeof requestedPath !== "string" ||
        requestedPath.includes("\0")
    ) {
        return null;
    }

    const trimmed = requestedPath.trim();

    if (trimmed === "") {
        return root;
    }

    if (
        trimmed.startsWith("/") ||
        trimmed.startsWith("\\") ||
        /^[a-zA-Z]:/.test(trimmed)
    ) {
        return null;
    }

    if (trimmed.split(/[\\/]+/).includes("..")) {
        return null;
    }

    const resolved = path.join(root, ...trimmed.split(/[\\/]+/));
    const relative = path.relative(root, resolved);

    if (
        relative === ".." ||
        relative.startsWith(".." + path.sep) ||
        path.isAbsolute(relative)
    ) {
        return null;
    }

    return resolved;
};

const assertRealPathWithin = (root, target) => {
    const realRoot = fs.realpathSync(root);
    const realTarget = fs.realpathSync(target);
    const relative = path.relative(realRoot, realTarget);

    if (
        relative === ".." ||
        relative.startsWith(".." + path.sep) ||
        path.isAbsolute(relative)
    ) {
        throw new Error("Path escapes repository");
    }
};

export {
    MAX_FILE_SIZE,
    getRepoRoot,
    getStorageRoot,
    ensureRepoStorageDir,
    removeRepoStorageDir,
    resolveRepoPath,
    assertRealPathWithin
};
