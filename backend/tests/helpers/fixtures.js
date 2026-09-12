import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "../../utils/repoStorage.js";

/* Shared repository fixtures matching the filesystem-backed commit engine.
   REPO_STORAGE_ROOT must be set before repoStorage-dependent imports load. */

export const createRepo = (Repository, ownerId, name, visibility = "public") =>
    Repository.create({
        name,
        visibility,
        owner: ownerId,
        branches: ["main"]
    });

export const repoRoot = (ownerId, repoId) =>
    getRepoRoot(ownerId, repoId);

export const writeRepoFile = async (ownerId, repoId, relativePath, content) => {
    const target = path.join(getRepoRoot(ownerId, repoId), relativePath);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, content);
};

export const readRepoFile = async (ownerId, repoId, relativePath) =>
    fs.promises.readFile(
        path.join(getRepoRoot(ownerId, repoId), relativePath),
        "utf-8"
    );
