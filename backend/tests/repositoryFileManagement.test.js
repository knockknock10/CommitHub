import {
    after,
    before,
    beforeEach,
    describe,
    it
} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express from "express";

import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import {
    MAX_FILE_SIZE,
    getRepoRoot
} from "../utils/repoStorage.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-files-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_files_test?");

const app = express();

app.use(express.json({ limit: "4mb" }));
app.use("/api/repositories", repositoryRoutes);

let server;
let baseUrl;

const tokenFor = (userId) =>
    jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, {
        expiresIn: "1h"
    });

const request = (path, options = {}) =>
    fetch(`${baseUrl}${path}`, options);

const jsonRequest = (path, method, body, token) =>
    request(path, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });

const getRequest = (path, token) =>
    request(path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

let owner;
let other;
let ownerToken;
let otherToken;

const createRepo = async (name, visibility = "public") =>
    Repository.create({
        name,
        visibility,
        owner: owner._id,
        branches: ["main"]
    });

const repoRoot = (repository) =>
    getRepoRoot(owner._id, repository._id);

const writeRepoFile = async (repository, relativePath, content) => {
    const target = path.join(repoRoot(repository), relativePath);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, content);
};

const readRepoFile = async (repository, relativePath) =>
    fs.promises.readFile(
        path.join(repoRoot(repository), relativePath),
        "utf-8"
    );

const fileExists = async (repository, relativePath) => {
    try {
        await fs.promises.access(path.join(repoRoot(repository), relativePath));
        return true;
    } catch {
        return false;
    }
};

const createFileRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/file`,
        "POST",
        body,
        token
    );

const editFileRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/file`,
        "PUT",
        body,
        token
    );

const deleteFileRequest = (repository, relativePath, token) =>
    request(
        `/api/repositories/${repository._id}/file?path=${encodeURIComponent(relativePath)}`,
        {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
    );

const createDirectoryRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/directory`,
        "POST",
        body,
        token
    );

const deleteDirectoryRequest = (repository, relativePath, token) =>
    request(
        `/api/repositories/${repository._id}/directory?path=${encodeURIComponent(relativePath)}`,
        {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
    );

const createCommitRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/commits`,
        "POST",
        body,
        token
    );

const createBranchRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/branches`,
        "POST",
        body,
        token
    );

const checkoutRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/branches/checkout`,
        "POST",
        body,
        token
    );

before(async () => {
    await mongoose.connect(mongoUri);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
    await Promise.all([
        User.deleteMany({}),
        Repository.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    await fs.promises.mkdir(storageRoot, { recursive: true });

    owner = await User.create({
        userName: "owneruser",
        email: "owner@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    other = await User.create({
        userName: "otheruser",
        email: "other@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    ownerToken = tokenFor(owner._id);
    otherToken = tokenFor(other._id);
});

after(async () => {
    await Promise.all([
        User.deleteMany({}),
        Repository.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });

    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("directory listing", () => {
    it("lists the root directory with folders first and metadata", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");
        await writeRepoFile(repo, "src/app.js", "code");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        const names = body.entries.map((entry) => entry.name);

        assert.deepEqual(names, ["src", "README.md"]);
        assert.equal(body.entries[0].type, "folder");
        assert.equal(body.entries[1].type, "file");
        assert.equal(typeof body.entries[1].size, "number");
        assert.equal(typeof body.entries[0].updatedAt, "number");
    });

    it("lists a nested directory via the path query parameter", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "backend/routes/a.js", "x");
        await writeRepoFile(repo, "backend/server.js", "y");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent("backend")}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.path, "backend");
        assert.deepEqual(
            body.entries.map((entry) => entry.name),
            ["routes", "server.js"]
        );
    });
});

describe("file retrieval", () => {
    it("returns content, name, path, size, updatedAt, and a hash", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "src/app.js", "console.log(1)");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("src/app.js")}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.name, "app.js");
        assert.equal(body.path, "src/app.js");
        assert.equal(body.content, "console.log(1)");
        assert.equal(typeof body.size, "number");
        assert.equal(typeof body.updatedAt, "number");
        assert.equal(typeof body.hash, "string");
        assert.ok(body.hash.length >= 32);
    });

    it("returns 404 when the file does not exist", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("missing.txt")}`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 when a directory is requested as a file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "folder/a.txt", "x");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("folder")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });
});

describe("file creation", () => {
    it("creates a file on disk and returns its metadata", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "README.md", content: "# Hello" },
            ownerToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();
        assert.equal(body.path, "README.md");
        assert.equal(body.name, "README.md");
        assert.equal(body.size, 7);

        assert.equal(await readRepoFile(repo, "README.md"), "# Hello");
    });

    it("creates a nested file and its parent directories", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "src/utils/helper.js", content: "export const x = 1;" },
            ownerToken
        );

        assert.equal(response.status, 201);

        assert.equal(
            await readRepoFile(repo, "src/utils/helper.js"),
            "export const x = 1;"
        );

        const listing = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent("src/utils")}`,
            ownerToken
        );
        const body = await listing.json();
        assert.deepEqual(
            body.entries.map((entry) => entry.name),
            ["helper.js"]
        );
    });

    it("rejects creating a file that already exists", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "original");

        const response = await createFileRequest(
            repo,
            { path: "README.md", content: "overwrite attempt" },
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.equal(
            (await response.json()).message,
            "File already exists"
        );
        assert.equal(await readRepoFile(repo, "README.md"), "original");
    });

    it("rejects creating a file with non-string content", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "data.json", content: { not: "text" } },
            ownerToken
        );

        assert.equal(response.status, 400);
    });
});

describe("file editing", () => {
    it("updates the file content on disk", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "version 1");

        const response = await editFileRequest(
            repo,
            { path: "app.js", content: "version 2" },
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.path, "app.js");
        assert.equal(body.size, 9);

        assert.equal(await readRepoFile(repo, "app.js"), "version 2");
    });

    it("returns 404 when editing a missing file", async () => {
        const repo = await createRepo("myrepo");

        const response = await editFileRequest(
            repo,
            { path: "missing.txt", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 when editing a directory", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "folder/a.txt", "x");

        const response = await editFileRequest(
            repo,
            { path: "folder", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 409 when the expected hash does not match", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "version 1");

        const conflict = await editFileRequest(
            repo,
            { path: "app.js", content: "version 2", expectedHash: "wrong-hash" },
            ownerToken
        );

        assert.equal(conflict.status, 409);
        assert.equal(await readRepoFile(repo, "app.js"), "version 1");
    });

    it("allows editing when the expected hash matches", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "version 1");

        const read = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("app.js")}`,
            ownerToken
        );
        const { hash } = await read.json();

        const response = await editFileRequest(
            repo,
            { path: "app.js", content: "version 2", expectedHash: hash },
            ownerToken
        );

        assert.equal(response.status, 200);
        assert.equal(await readRepoFile(repo, "app.js"), "version 2");
    });
});

describe("file deletion", () => {
    it("deletes the file from disk and the listing", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "old.txt", "data");

        const response = await deleteFileRequest(repo, "old.txt", ownerToken);

        assert.equal(response.status, 200);
        assert.equal(await fileExists(repo, "old.txt"), false);
    });

    it("returns 404 when deleting a missing file", async () => {
        const repo = await createRepo("myrepo");

        const response = await deleteFileRequest(repo, "missing.txt", ownerToken);

        assert.equal(response.status, 404);
    });

    it("returns 400 when deleting a directory through the file endpoint", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "folder/a.txt", "x");

        const response = await deleteFileRequest(repo, "folder", ownerToken);

        assert.equal(response.status, 400);
        assert.equal(await fileExists(repo, "folder/a.txt"), true);
    });
});

describe("path security", () => {
    it("returns 400 for an empty path on create", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "   ", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a path traversal attempt on create", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "../../etc/passwd", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.equal(await fileExists(repo, "etc"), false);
    });

    it("returns 400 for an absolute path on create", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "/etc/passwd", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a path traversal attempt on edit", async () => {
        const repo = await createRepo("myrepo");

        const response = await editFileRequest(
            repo,
            { path: "../.env", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a path traversal attempt on delete", async () => {
        const repo = await createRepo("myrepo");

        const response = await deleteFileRequest(repo, "../../.env", ownerToken);

        assert.equal(response.status, 400);
    });

    it("rejects creating a file inside .CommitHub", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: ".CommitHub/evil.txt", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.equal(await fileExists(repo, ".CommitHub/evil.txt"), false);
    });

    it("rejects editing a file inside .CommitHub", async () => {
        const repo = await createRepo("myrepo");

        const response = await editFileRequest(
            repo,
            { path: ".CommitHub/HEAD", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects deleting a file inside .CommitHub", async () => {
        const repo = await createRepo("myrepo");

        const response = await deleteFileRequest(
            repo,
            ".CommitHub/refs/heads/main",
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects creating a directory inside .CommitHub", async () => {
        const repo = await createRepo("myrepo");

        const response = await createDirectoryRequest(
            repo,
            { path: ".CommitHub/newdir" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects writing through a symlink that escapes the repository", async () => {
        const repo = await createRepo("myrepo");
        const outsideDir = path.join(storageRoot, "outside-dir");
        await fs.promises.mkdir(outsideDir, { recursive: true });
        await fs.promises.mkdir(repoRoot(repo), { recursive: true });
        await fs.promises.symlink(
            outsideDir,
            path.join(repoRoot(repo), "evil-link")
        );

        const response = await createFileRequest(
            repo,
            { path: "evil-link/leak.txt", content: "x" },
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.equal(
            await fs.promises.access(
                path.join(outsideDir, "leak.txt"),
                fs.constants.F_OK
            ).then(() => true).catch(() => false),
            false
        );
    });
});

describe("authorization", () => {
    it("returns 401 when creating a file without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "a.txt", content: "x" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 401 when reading a file without a token", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "x");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=a.txt`
        );

        assert.equal(response.status, 401);
    });

    it("returns 403 when a non-owner creates a file in a public repository", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "a.txt", content: "x" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 403 when a non-owner edits a file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "x");

        const response = await editFileRequest(
            repo,
            { path: "a.txt", content: "y" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 403 when a non-owner deletes a file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "x");

        const response = await deleteFileRequest(repo, "a.txt", otherToken);

        assert.equal(response.status, 403);
        assert.equal(await fileExists(repo, "a.txt"), true);
    });

    it("returns 403 when a non-owner creates a directory", async () => {
        const repo = await createRepo("myrepo");

        const response = await createDirectoryRequest(
            repo,
            { path: "folder" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 403 when reading a private repository as a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "secret.txt", "data");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("secret.txt")}`,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 403 when writing to a private repository as a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");

        const response = await createFileRequest(
            repo,
            { path: "secret.txt", content: "data" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("allows reading a public repository file as any authenticated user", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("README.md")}`,
            otherToken
        );

        assert.equal(response.status, 200);
        assert.equal((await response.json()).content, "# Hello");
    });

    it("allows the owner to read their own private repository file", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "secret.txt", "data");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("secret.txt")}`,
            ownerToken
        );

        assert.equal(response.status, 200);
    });
});

describe("directory management", () => {
    it("creates an empty directory", async () => {
        const repo = await createRepo("myrepo");

        const response = await createDirectoryRequest(
            repo,
            { path: "assets" },
            ownerToken
        );

        assert.equal(response.status, 201);
        assert.equal(
            (await response.json()).name,
            "assets"
        );
        assert.equal(await fileExists(repo, "assets"), true);
    });

    it("rejects creating a directory that already exists", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "assets/logo.png", "data");

        const response = await createDirectoryRequest(
            repo,
            { path: "assets" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects creating a directory with a missing parent", async () => {
        const repo = await createRepo("myrepo");

        const response = await createDirectoryRequest(
            repo,
            { path: "missing/deeper" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("deletes an empty directory", async () => {
        const repo = await createRepo("myrepo");
        await fs.promises.mkdir(
            path.join(repoRoot(repo), "empty-dir"),
            { recursive: true }
        );

        const response = await deleteDirectoryRequest(
            repo,
            "empty-dir",
            ownerToken
        );

        assert.equal(response.status, 200);
        assert.equal(await fileExists(repo, "empty-dir"), false);
    });

    it("refuses to delete a non-empty directory", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "folder/a.txt", "x");

        const response = await deleteDirectoryRequest(repo, "folder", ownerToken);

        assert.equal(response.status, 400);
        assert.equal(
            (await response.json()).message,
            "Directory is not empty"
        );
        assert.equal(await fileExists(repo, "folder/a.txt"), true);
    });

    it("returns 404 when deleting a missing directory", async () => {
        const repo = await createRepo("myrepo");

        const response = await deleteDirectoryRequest(
            repo,
            "missing",
            ownerToken
        );

        assert.equal(response.status, 404);
    });
});

describe("limits", () => {
    it("returns 413 when creating a file larger than the limit", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "big.txt", content: "a".repeat(MAX_FILE_SIZE + 1) },
            ownerToken
        );

        assert.equal(response.status, 413);
        assert.equal(await fileExists(repo, "big.txt"), false);
    });

    it("returns 413 when editing a file to be larger than the limit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "small");

        const response = await editFileRequest(
            repo,
            { path: "app.js", content: "b".repeat(MAX_FILE_SIZE + 1) },
            ownerToken
        );

        assert.equal(response.status, 413);
        assert.equal(await readRepoFile(repo, "app.js"), "small");
    });

    it("rejects binary content through the create endpoint", async () => {
        const repo = await createRepo("myrepo");

        const response = await createFileRequest(
            repo,
            { path: "image.png", content: "PNG\0data" },
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.equal(await fileExists(repo, "image.png"), false);
    });

    it("refuses to render a binary file as text", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "image.png", "PNG\0data");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("image.png")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });
});

describe("branch-aware working tree", () => {
    it("keeps file operations on the checked-out branch's working tree", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "main.txt", "main content");

        const first = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        assert.equal(first.status, 201);

        const created = await createBranchRequest(
            repo,
            { name: "feature/login" },
            ownerToken
        );
        assert.equal(created.status, 201);

        const switched = await checkoutRequest(
            repo,
            { name: "feature/login" },
            ownerToken
        );
        assert.equal(switched.status, 200);

        const added = await createFileRequest(
            repo,
            { path: "feature.txt", content: "feature work" },
            ownerToken
        );
        assert.equal(added.status, 201);

        const featureCommit = await createCommitRequest(
            repo,
            { message: "feature commit" },
            ownerToken
        );
        assert.equal(featureCommit.status, 201);

        const backToMain = await checkoutRequest(
            repo,
            { name: "main" },
            ownerToken
        );
        assert.equal(backToMain.status, 200);

        const mainFeature = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("feature.txt")}`,
            ownerToken
        );
        assert.equal(mainFeature.status, 404);

        const mainFile = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("main.txt")}`,
            ownerToken
        );
        assert.equal(mainFile.status, 200);

        const backToFeature = await checkoutRequest(
            repo,
            { name: "feature/login" },
            ownerToken
        );
        assert.equal(backToFeature.status, 200);

        const featureFile = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("feature.txt")}`,
            ownerToken
        );
        assert.equal(featureFile.status, 200);
        assert.equal(
            (await featureFile.json()).content,
            "feature work"
        );
    });
});
