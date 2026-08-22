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
    getRepoRoot
} from "../utils/repoStorage.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-codebrowser-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_codebrowser_test?");

const app = express();

app.use(express.json({ limit: "4mb" }));
app.use("/api/repositories", repositoryRoutes);

let server;
let baseUrl;

const tokenFor = (userId) =>
    jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, {
        expiresIn: "1h"
    });

const request = (url, options = {}) =>
    fetch(`${baseUrl}${url}`, options);

const jsonRequest = (url, method, body, token) =>
    request(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });

const getRequest = (url, token) =>
    request(url, {
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

describe("branch-aware tree (branch-tree)", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await getRequest(
            "/api/repositories/not-an-id/branch-tree",
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await getRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}/branch-tree`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 403 for a private repository requested by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns an empty tree for a repository with no commits", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.branch, "main");
        assert.equal(body.commitId, null);
        assert.deepEqual(body.entries, []);
    });

    it("returns the tree from the HEAD commit of the specified branch", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");
        await writeRepoFile(repo, "src/app.js", "code");

        const commit = await createCommitRequest(
            repo,
            { message: "initial commit" },
            ownerToken
        );
        assert.equal(commit.status, 201);

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.branch, "main");
        assert.ok(body.commitId);
        assert.equal(body.commitMessage, "initial commit");
        assert.ok(body.commitAuthor);
        assert.ok(body.commitTimestamp);
        assert.equal(body.path, "");

        const names = body.entries.map((e) => e.name);
        assert.ok(names.includes("src"));
        assert.ok(names.includes("README.md"));
    });

    it("returns entries from the snapshot, not the working tree", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "file1.txt", "v1");

        const commit1 = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        assert.equal(commit1.status, 201);

        await writeRepoFile(repo, "file2.txt", "v2");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main`,
            ownerToken
        );

        const body = await response.json();
        const names = body.entries.map((e) => e.name);

        assert.ok(names.includes("file1.txt"));
        assert.ok(!names.includes("file2.txt"));
    });

    it("navigates into a subdirectory via the path parameter", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "src/controllers/repo.js", "x");
        await writeRepoFile(repo, "src/app.js", "y");

        const commit = await createCommitRequest(
            repo,
            { message: "add files" },
            ownerToken
        );
        assert.equal(commit.status, 201);

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=${encodeURIComponent("src")}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.path, "src");
        assert.deepEqual(
            body.entries.map((e) => e.name),
            ["controllers", "app.js"]
        );
    });

    it("returns 404 for a nonexistent path", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "hi");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );
        assert.equal(commit.status, 201);

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=missing`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 when the path points to a file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "hi");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );
        assert.equal(commit.status, 201);

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=${encodeURIComponent("README.md")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 for a nonexistent branch", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=nonexistent`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 for a path traversal attempt", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "hi");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );
        assert.equal(commit.status, 201);

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=${encodeURIComponent("../../etc")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for an absolute path", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=${encodeURIComponent("/etc/passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("allows public repository access for non-owners", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "public");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );
        assert.equal(commit.status, 201);

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`,
            otherToken
        );

        assert.equal(response.status, 200);
    });

    it("reflects changes across multiple branches independently", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "main.txt", "main content");

        const c1 = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        assert.equal(c1.status, 201);

        const br = await createBranchRequest(
            repo,
            { name: "feature" },
            ownerToken
        );
        assert.equal(br.status, 201);

        const sw = await checkoutRequest(
            repo,
            { name: "feature" },
            ownerToken
        );
        assert.equal(sw.status, 200);

        await writeRepoFile(repo, "feature.txt", "feature content");

        const c2 = await createCommitRequest(
            repo,
            { message: "feature commit" },
            ownerToken
        );
        assert.equal(c2.status, 201);

        const mainTree = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main`,
            ownerToken
        );
        const mainBody = await mainTree.json();
        const mainNames = mainBody.entries.map((e) => e.name);
        assert.ok(mainNames.includes("main.txt"));
        assert.ok(!mainNames.includes("feature.txt"));

        const featureTree = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=feature`,
            ownerToken
        );
        const featureBody = await featureTree.json();
        const featureNames = featureBody.entries.map((e) => e.name);
        assert.ok(featureNames.includes("main.txt"));
        assert.ok(featureNames.includes("feature.txt"));
    });
});

describe("branch-aware blob (branch-blob)", () => {
    it("returns file content from the branch HEAD snapshot", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello World");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );
        assert.equal(commit.status, 201);

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=${encodeURIComponent("README.md")}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.branch, "main");
        assert.ok(body.commitId);
        assert.equal(body.path, "README.md");
        assert.equal(body.name, "README.md");
        assert.equal(body.content, "# Hello World");
        assert.equal(typeof body.size, "number");
        assert.equal(typeof body.hash, "string");
    });

    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "hi");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=README.md`
        );

        assert.equal(response.status, 401);
    });

    it("returns 404 when the file does not exist in the snapshot", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "hi");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=${encodeURIComponent("missing.txt")}`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 when the path is a directory", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "src/app.js", "code");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=src`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 when no path is provided", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 for a nonexistent branch", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=nonexistent&path=README.md`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 for a path traversal attempt", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=${encodeURIComponent("../../etc/passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for an absolute path", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=${encodeURIComponent("/etc/passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns tooLarge flag for files exceeding the size limit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "big.txt", "x".repeat(1024 * 1024 + 1));

        const commit = await createCommitRequest(
            repo,
            { message: "big file" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=${encodeURIComponent("big.txt")}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.tooLarge, true);
        assert.ok(!body.content);
    });

    it("returns binary flag for binary files", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "image.png", "PNG\0binarydata");

        const commit = await createCommitRequest(
            repo,
            { message: "binary" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=${encodeURIComponent("image.png")}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.binary, true);
        assert.ok(!body.content);
    });

    it("returns different content for the same file on different branches", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "config.txt", "version1");

        const c1 = await createCommitRequest(
            repo,
            { message: "v1" },
            ownerToken
        );

        const br = await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        const sw = await checkoutRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        await writeRepoFile(repo, "config.txt", "version2");

        const c2 = await createCommitRequest(
            repo,
            { message: "v2" },
            ownerToken
        );

        const mainBlob = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=config.txt`,
            ownerToken
        );
        const mainBody = await mainBlob.json();
        assert.equal(mainBody.content, "version1");

        const devBlob = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=dev&path=config.txt`,
            ownerToken
        );
        const devBody = await devBlob.json();
        assert.equal(devBody.content, "version2");
    });

    it("returns 403 for a private repository non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "secret.txt", "secret");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=secret.txt`,
            otherToken
        );

        assert.equal(response.status, 403);
    });
});

describe("raw file (raw)", () => {
    it("serves the raw file with correct content-type", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "console.log('hello')");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/raw?branch=main&path=${encodeURIComponent("app.js")}`,
            ownerToken
        );

        assert.equal(response.status, 200);
        assert.ok(response.headers.get("content-type").includes("javascript"));
        assert.ok(response.headers.get("content-disposition").includes("app.js"));

        const text = await response.text();
        assert.equal(text, "console.log('hello')");
    });

    it("returns 404 for a nonexistent file", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/raw?branch=main&path=missing.txt`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 400 for a path traversal attempt", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/raw?branch=main&path=${encodeURIComponent("../../etc/passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 403 for a private repository non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "secret.txt", "secret");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/raw?branch=main&path=secret.txt`,
            otherToken
        );

        assert.equal(response.status, 403);
    });
});

describe("file history (file-history)", () => {
    it("returns commits that modified a specific file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "v1");

        const c1 = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        assert.equal(c1.status, 201);

        await writeRepoFile(repo, "README.md", "v2");

        const c2 = await createCommitRequest(
            repo,
            { message: "update" },
            ownerToken
        );
        assert.equal(c2.status, 201);

        const response = await getRequest(
            `/api/repositories/${repo._id}/file-history?branch=main&path=${encodeURIComponent("README.md")}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.path, "README.md");
        assert.ok(body.commits.length >= 2);
        assert.equal(body.commits[0].message, "update");
        assert.equal(body.commits[1].message, "first");
    });

    it("returns 400 when no path is provided", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file-history?branch=main`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns an empty list for a file with no history", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "hi");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/file-history?branch=main&path=${encodeURIComponent("never-existed.txt")}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.deepEqual(body.commits, []);
    });

    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/file-history?branch=main&path=README.md`
        );

        assert.equal(response.status, 401);
    });
});

describe("create file through commit system (branch-file/create)", () => {
    it("creates a file and a commit", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "README.md",
                content: "# Hello",
                commitMessage: "Add README"
            },
            ownerToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();
        assert.ok(body.commit);
        assert.ok(body.commit.id);
        assert.equal(body.commit.message, "Add README");
        assert.ok(body.file);
        assert.equal(body.file.path, "README.md");

        const verify = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=README.md`,
            ownerToken
        );
        const verifyBody = await verify.json();
        assert.equal(verifyBody.content, "# Hello");
    });

    it("rejects creating a file that already exists", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "existing");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "README.md",
                content: "overwrite",
                commitMessage: "overwrite"
            },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects when commit message is empty", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "README.md",
                content: "# Hello",
                commitMessage: ""
            },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects when path is a traversal attempt", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "../../etc/passwd",
                content: "evil",
                commitMessage: "traversal"
            },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 409 when expectedHead does not match", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "README.md",
                content: "# Hello",
                commitMessage: "Add README",
                expectedHead: "wrong-head-id"
            },
            ownerToken
        );

        assert.equal(response.status, 409);
    });

    it("returns 403 when a non-owner tries to create", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "README.md",
                content: "# Hello",
                commitMessage: "Add README"
            },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("creates nested files with parent directories", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "src/utils/helper.js",
                content: "export const x = 1;",
                commitMessage: "Add helper"
            },
            ownerToken
        );

        assert.equal(response.status, 201);

        const verify = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=${encodeURIComponent("src/utils/helper.js")}`,
            ownerToken
        );
        assert.equal(verify.status, 200);
        assert.equal((await verify.json()).content, "export const x = 1;");
    });

    it("moves the branch HEAD after creating a file", async () => {
        const repo = await createRepo("myrepo");

        const before = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`,
            ownerToken
        );
        const beforeBody = await before.json();
        const beforeCommit = beforeBody.commitId;

        await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "README.md",
                content: "# Hello",
                commitMessage: "Add README"
            },
            ownerToken
        );

        const after = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`,
            ownerToken
        );
        const afterBody = await after.json();

        assert.notEqual(afterBody.commitId, beforeCommit);
    });

    it("rejects content that contains null bytes", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "binary.txt",
                content: "hello\0world",
                commitMessage: "binary content"
            },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects content exceeding the size limit", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "big.txt",
                content: "x".repeat(1024 * 1024 + 1),
                commitMessage: "big file"
            },
            ownerToken
        );

        assert.equal(response.status, 413);
    });
});

describe("edit file through commit system (branch-file/edit)", () => {
    it("edits a file and creates a commit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "v1");

        const c1 = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );
        assert.equal(c1.status, 201);

        const beforeTree = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`,
            ownerToken
        );
        const beforeMeta = await beforeTree.json();

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/edit`,
            "PUT",
            {
                branch: "main",
                path: "app.js",
                content: "v2",
                commitMessage: "update app",
                expectedHead: beforeMeta.commitId
            },
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.ok(body.commit);
        assert.equal(body.commit.message, "update app");

        const verify = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=app.js`,
            ownerToken
        );
        assert.equal((await verify.json()).content, "v2");
    });

    it("returns 404 when editing a nonexistent file", async () => {
        const repo = await createRepo("myrepo");

        const beforeTree = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`,
            ownerToken
        );
        const beforeMeta = await beforeTree.json();

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/edit`,
            "PUT",
            {
                branch: "main",
                path: "missing.txt",
                content: "new",
                commitMessage: "edit missing"
            },
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 409 when expectedHead does not match", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "v1");

        const c1 = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/edit`,
            "PUT",
            {
                branch: "main",
                path: "app.js",
                content: "v2",
                commitMessage: "update",
                expectedHead: "wrong-head"
            },
            ownerToken
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/edit`,
            "PUT",
            {
                branch: "main",
                path: "app.js",
                content: "v3",
                commitMessage: "conflict",
                expectedHead: "wrong-head"
            },
            ownerToken
        );

        assert.equal(response.status, 409);
    });

    it("does not mutate old commit snapshots", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "data.txt", "original");

        const c1 = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        assert.equal(c1.status, 201);

        const firstCommitId = (await c1.json()).id;

        await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/edit`,
            "PUT",
            {
                branch: "main",
                path: "data.txt",
                content: "modified",
                commitMessage: "edit"
            },
            ownerToken
        );

        const oldCommit = await getRequest(
            `/api/repositories/${repo._id}/commits/${firstCommitId}`,
            ownerToken
        );
        const oldBody = await oldCommit.json();
        const fileChange = oldBody.files.find(
            (f) => f.path === "data.txt"
        );
        assert.ok(fileChange);

        const rawOld = await getRequest(
            `/api/repositories/${repo._id}/raw?branch=main&path=data.txt`,
            ownerToken
        );
        assert.equal(await rawOld.text(), "modified");

        const snapshotPath = path.join(
            repoRoot(repo),
            ".CommitHub",
            "commits",
            firstCommitId,
            "snapshot",
            "data.txt"
        );
        const snapshotContent = await fs.promises.readFile(
            snapshotPath,
            "utf-8"
        );
        assert.equal(snapshotContent, "original");
    });

    it("returns 403 for non-owner edit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "v1");

        const c1 = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/edit`,
            "PUT",
            {
                branch: "main",
                path: "app.js",
                content: "hacked",
                commitMessage: "hack"
            },
            otherToken
        );

        assert.equal(response.status, 403);
    });
});

describe("delete file through commit system (branch-file/remove)", () => {
    it("deletes a file and creates a commit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "old.txt", "data");

        const c1 = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const beforeTree = await getRequest(
            `/api/repositories/${repo._id}/branch-tree`,
            ownerToken
        );
        const beforeMeta = await beforeTree.json();

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/remove`,
            "DELETE",
            {
                branch: "main",
                path: "old.txt",
                commitMessage: "remove old file",
                expectedHead: beforeMeta.commitId
            },
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.ok(body.commit);

        const verify = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=old.txt`,
            ownerToken
        );
        assert.equal(verify.status, 404);
    });

    it("returns 404 when deleting a nonexistent file", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/remove`,
            "DELETE",
            {
                branch: "main",
                path: "missing.txt",
                commitMessage: "delete missing"
            },
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 409 when expectedHead does not match", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "data");

        const c1 = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/remove`,
            "DELETE",
            {
                branch: "main",
                path: "app.js",
                commitMessage: "delete",
                expectedHead: "wrong-head"
            },
            ownerToken
        );

        assert.equal(response.status, 409);
    });

    it("returns 400 for a traversal attempt", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/remove`,
            "DELETE",
            {
                branch: "main",
                path: "../../etc/passwd",
                commitMessage: "traversal"
            },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 403 for non-owner delete", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "app.js", "data");

        const c1 = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/branch-file/remove`,
            "DELETE",
            {
                branch: "main",
                path: "app.js",
                commitMessage: "hack delete"
            },
            otherToken
        );

        assert.equal(response.status, 403);
    });
});

describe("path traversal protection across all endpoints", () => {
    it("rejects encoded traversal on branch-tree", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "hi");

        const commit = await createCommitRequest(
            repo,
            { message: "init" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=${encodeURIComponent("../../etc/passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects encoded traversal on branch-blob", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-blob?branch=main&path=${encodeURIComponent("../../etc/passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects encoded traversal on raw", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/raw?branch=main&path=${encodeURIComponent("../../etc/passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects backslash traversal on branch-tree", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=${encodeURIComponent("..\\..\\etc\\passwd")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects absolute paths on branch-tree", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=${encodeURIComponent("/Users/kr/.env")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects C:\\ paths on branch-tree", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/branch-tree?branch=main&path=${encodeURIComponent("C:\\Windows\\System32")}`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });
});

describe("cross-repository isolation", () => {
    it("cannot access files from another repository via path tricks", async () => {
        const repo1 = await createRepo("repo1");
        await writeRepoFile(repo1, "secret.txt", "repo1-secret");

        const c1 = await createCommitRequest(
            repo1,
            { message: "init" },
            ownerToken
        );

        const repo2 = await createRepo("repo2");

        const response = await jsonRequest(
            `/api/repositories/${repo2._id}/branch-file/create`,
            "POST",
            {
                branch: "main",
                path: "README.md",
                content: "# Repo2",
                commitMessage: "init repo2"
            },
            ownerToken
        );
        assert.equal(response.status, 201);

        const blob = await getRequest(
            `/api/repositories/${repo1._id}/branch-blob?branch=main&path=secret.txt`,
            ownerToken
        );
        assert.equal(blob.status, 200);
        assert.equal((await blob.json()).content, "repo1-secret");
    });
});
