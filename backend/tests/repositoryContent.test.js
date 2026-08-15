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
    path.join(os.tmpdir(), "commithub-content-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_content_test?");

const app = express();

app.use(express.json());
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

describe("getRepositoryTree", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree`
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await getRequest(
            "/api/repositories/not-an-id/tree",
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await getRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}/tree`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 403 for a private repository requested by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree`,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns the tree of a public repository for any authenticated user", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree`,
            otherToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.path, "");
        assert.equal(body.entries.length, 1);
        assert.equal(body.entries[0].name, "README.md");
        assert.equal(body.entries[0].type, "file");
    });

    it("returns the tree of a private repository for its owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "secret.txt", "data");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.entries.length, 1);
        assert.equal(body.entries[0].name, "secret.txt");
    });

    it("returns an empty entry list for a repository with no files", async () => {
        const repo = await createRepo("emptyrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.deepEqual(body.entries, []);
    });

    it("lists folders first then files, each alphabetically", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "zebra.txt", "a");
        await writeRepoFile(repo, "alpha.txt", "b");
        await writeRepoFile(repo, "folder-b/file.txt", "c");
        await writeRepoFile(repo, "folder-a/file.txt", "d");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree`,
            ownerToken
        );

        const body = await response.json();
        const names = body.entries.map((entry) => entry.name);

        assert.deepEqual(names, ["folder-a", "folder-b", "alpha.txt", "zebra.txt"]);

        const folder = body.entries.find((entry) => entry.name === "folder-a");
        const file = body.entries.find((entry) => entry.name === "alpha.txt");

        assert.equal(folder.type, "folder");
        assert.equal(folder.path, "folder-a");
        assert.equal(file.type, "file");
        assert.equal(file.path, "alpha.txt");
        assert.equal(typeof file.size, "number");
    });

    it("lists nested directories via the path query parameter", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "backend/controllers/repo.js", "x");
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
            ["controllers", "server.js"]
        );
    });

    it("returns 404 for a path that does not exist", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent("missing")}`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 when the path points to a file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent("README.md")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a path traversal attempt", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent("../../.env")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for an absolute path", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent("/etc")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a backslash traversal attempt", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent("..\\..\\etc\\passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("does not expose the version control directory via the tree", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const root = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent(".CommitHub")}`,
            ownerToken
        );
        const nested = await getRequest(
            `/api/repositories/${repo._id}/tree?path=${encodeURIComponent(".CommitHub/refs/heads")}`,
            ownerToken
        );

        assert.equal(root.status, 404);
        assert.equal(nested.status, 404);
    });
});

describe("getRepositoryFile", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("README.md")}`
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await getRequest(
            "/api/repositories/not-an-id/file?path=README.md",
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await getRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}/file?path=README.md`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 403 for a private repository requested by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "secret.txt", "data");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("secret.txt")}`,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns the file for a public repository requested by any user", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("README.md")}`,
            otherToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.name, "README.md");
        assert.equal(body.path, "README.md");
        assert.equal(body.content, "# Hello");
        assert.equal(typeof body.size, "number");
    });

    it("returns 400 when no path is provided", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the file does not exist", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("missing.txt")}`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 when the path is a directory", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "folder/file.txt", "x");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("folder")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a path traversal attempt", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("../../.env")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a path outside the repository root", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("/etc/passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 413 for a file larger than the limit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(
            repo,
            "big.txt",
            Buffer.alloc(MAX_FILE_SIZE + 1)
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("big.txt")}`,
            ownerToken
        );

        assert.equal(response.status, 413);
    });

    it("returns 400 for a binary file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "image.png", "PNG\0data");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("image.png")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a file reached through a symlink escaping the repository", async () => {
        const repo = await createRepo("myrepo");
        const outsideFile = path.join(storageRoot, "outside-secret.txt");
        await fs.promises.writeFile(outsideFile, "secret");
        await fs.promises.mkdir(repoRoot(repo), { recursive: true });
        await fs.promises.symlink(outsideFile, path.join(repoRoot(repo), "evil.txt"));

        const response = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent("evil.txt")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("does not expose version control files via the file endpoint", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const head = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent(".CommitHub/HEAD")}`,
            ownerToken
        );
        const root = await getRequest(
            `/api/repositories/${repo._id}/file?path=${encodeURIComponent(".CommitHub")}`,
            ownerToken
        );

        assert.equal(head.status, 404);
        assert.equal(root.status, 404);
    });
});
