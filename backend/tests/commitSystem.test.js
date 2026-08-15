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
import crypto from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express from "express";

import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import { getRepoRoot } from "../utils/repoStorage.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-commit-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_commit_test?");

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

const removeRepoFile = async (repository, relativePath) => {
    await fs.promises.rm(
        path.join(repoRoot(repository), relativePath),
        { force: true }
    );
};

const createCommitRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/commits`,
        "POST",
        body,
        token
    );

const commitSnapshotPath = (repository, commitId, relativePath) =>
    path.join(
        repoRoot(repository),
        ".CommitHub",
        "commits",
        commitId,
        "snapshot",
        relativePath
    );

const branchRefPath = (repository) =>
    path.join(
        repoRoot(repository),
        ".CommitHub",
        "refs",
        "heads",
        "main"
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

describe("commit creation", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await createCommitRequest(
            repo,
            { message: "first" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await jsonRequest(
            "/api/repositories/not-an-id/commits",
            "POST",
            { message: "first" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await jsonRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}/commits`,
            "POST",
            { message: "first" },
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 403 for a private repository committed by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");

        const response = await createCommitRequest(
            repo,
            { message: "first" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 403 for a public repository committed by a non-owner", async () => {
        const repo = await createRepo("myrepo");

        const response = await createCommitRequest(
            repo,
            { message: "first" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 400 for a missing commit message", async () => {
        const repo = await createRepo("myrepo");

        const response = await createCommitRequest(
            repo,
            {},
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for an empty commit message", async () => {
        const repo = await createRepo("myrepo");

        const response = await createCommitRequest(
            repo,
            { message: "   " },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for an oversized commit message", async () => {
        const repo = await createRepo("myrepo");

        const response = await createCommitRequest(
            repo,
            { message: "a".repeat(201) },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("creates a commit with an added file and its metadata", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");

        const response = await createCommitRequest(
            repo,
            { message: "Add readme" },
            ownerToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.ok(body.id);
        assert.equal(body.message, "Add readme");
        assert.equal(body.author.name, "owneruser");
        assert.equal(body.author.email, "owner@test.com");
        assert.equal(typeof body.timestamp, "number");
        assert.equal(body.parent, null);
        assert.deepEqual(body.files, [
            { path: "README.md", status: "A" }
        ]);
    });

    it("commits nested files and preserves the snapshot structure", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "src/app.js", "console.log(1)");
        await writeRepoFile(repo, "src/utils/helper.js", "export const x = 1;");

        const response = await createCommitRequest(
            repo,
            { message: "Add app" },
            ownerToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();
        const snapshot = await fs.promises.readFile(
            commitSnapshotPath(repo, body.id, "src/utils/helper.js"),
            "utf-8"
        );

        assert.equal(snapshot, "export const x = 1;");
    });

    it("records the parent commit for a follow-up commit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");

        const first = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        const firstCommit = await first.json();

        assert.equal(firstCommit.parent, null);

        await writeRepoFile(repo, "b.txt", "two");

        const second = await createCommitRequest(
            repo,
            { message: "second" },
            ownerToken
        );

        assert.equal(second.status, 201);

        const secondCommit = await second.json();

        assert.equal(secondCommit.parent, firstCommit.id);
    });

    it("detects a modified file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "version 1");

        const first = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        const firstCommit = await first.json();

        await writeRepoFile(repo, "README.md", "version 2");

        const second = await createCommitRequest(
            repo,
            { message: "second" },
            ownerToken
        );

        assert.equal(second.status, 201);

        const secondCommit = await second.json();

        assert.deepEqual(secondCommit.files, [
            { path: "README.md", status: "M" }
        ]);
        assert.equal(
            await fs.promises.readFile(
                commitSnapshotPath(repo, secondCommit.id, "README.md"),
                "utf-8"
            ),
            "version 2"
        );
        assert.equal(
            await fs.promises.readFile(
                commitSnapshotPath(repo, firstCommit.id, "README.md"),
                "utf-8"
            ),
            "version 1"
        );
    });

    it("detects a deleted file", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "old.txt", "data");
        await writeRepoFile(repo, "keep.txt", "keep");

        await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );

        await removeRepoFile(repo, "old.txt");

        const second = await createCommitRequest(
            repo,
            { message: "remove old" },
            ownerToken
        );

        assert.equal(second.status, 201);

        const secondCommit = await second.json();

        assert.deepEqual(secondCommit.files, [
            { path: "old.txt", status: "D" }
        ]);
    });

    it("returns 400 when there are no changes to commit", async () => {
        const repo = await createRepo("myrepo");

        const response = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );

        assert.equal(response.status, 400);

        const body = await response.json();

        assert.equal(body.message, "No changes to commit");
    });

    it("returns 400 for an empty commit after a successful commit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");

        const first = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );

        assert.equal(first.status, 201);

        const second = await createCommitRequest(
            repo,
            { message: "second" },
            ownerToken
        );

        assert.equal(second.status, 400);
        assert.equal(
            (await second.json()).message,
            "No changes to commit"
        );
    });

    it("keeps the snapshot unchanged after later working-tree changes", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "version 1");

        const first = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        const firstCommit = await first.json();

        await writeRepoFile(repo, "README.md", "version 2");
        await writeRepoFile(repo, "new.txt", "new");

        const snapshot = await fs.promises.readFile(
            commitSnapshotPath(repo, firstCommit.id, "README.md"),
            "utf-8"
        );

        assert.equal(snapshot, "version 1");

        const listing = await fs.promises.readdir(
            path.join(
                repoRoot(repo),
                ".CommitHub",
                "commits",
                firstCommit.id,
                "snapshot"
            )
        );

        assert.ok(!listing.includes("new.txt"));
    });

    it("updates the branch reference to the new commit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");

        const response = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        const commit = await response.json();

        const ref = await fs.promises.readFile(branchRefPath(repo), "utf-8");

        assert.equal(ref.trim(), commit.id);
    });

    it("does not include the .CommitHub bookkeeping in commits", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");

        const response = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.ok(
            body.files.every(
                (change) => !change.path.startsWith(".CommitHub")
            )
        );
    });
});

describe("commit history", () => {
    it("returns an empty history for a repository with no commits", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.deepEqual(body.commits, []);
    });

    it("returns history newest first with the correct metadata", async () => {
        const repo = await createRepo("myrepo");

        await writeRepoFile(repo, "a.txt", "one");
        await createCommitRequest(
            repo,
            { message: "first commit" },
            ownerToken
        );

        await writeRepoFile(repo, "b.txt", "two");
        await createCommitRequest(
            repo,
            { message: "second commit" },
            ownerToken
        );

        await writeRepoFile(repo, "c.txt", "three");
        await createCommitRequest(
            repo,
            { message: "third commit" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        const commits = body.commits;

        assert.equal(commits.length, 3);
        assert.equal(commits[0].message, "third commit");
        assert.equal(commits[1].message, "second commit");
        assert.equal(commits[2].message, "first commit");
        assert.equal(commits[0].parent, commits[1].id);
        assert.equal(commits[1].parent, commits[2].id);
        assert.equal(commits[2].parent, null);

        for (const commit of commits) {
            assert.ok(commit.id);
            assert.equal(commit.author.name, "owneruser");
            assert.equal(typeof commit.timestamp, "number");
        }
    });

    it("honours the limit query parameter", async () => {
        const repo = await createRepo("myrepo");

        for (let i = 1; i <= 5; i += 1) {
            await writeRepoFile(repo, `file-${i}.txt`, `${i}`);
            await createCommitRequest(
                repo,
                { message: `commit ${i}` },
                ownerToken
            );
        }

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits?limit=2`,
            ownerToken
        );

        const body = await response.json();

        assert.equal(body.commits.length, 2);
        assert.equal(body.commits[0].message, "commit 5");
        assert.equal(body.commits[1].message, "commit 4");
    });

    it("honours the offset query parameter", async () => {
        const repo = await createRepo("myrepo");

        for (let i = 1; i <= 4; i += 1) {
            await writeRepoFile(repo, `file-${i}.txt`, `${i}`);
            await createCommitRequest(
                repo,
                { message: `commit ${i}` },
                ownerToken
            );
        }

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits?limit=10&offset=2`,
            ownerToken
        );

        const body = await response.json();

        assert.equal(body.commits.length, 2);
        assert.equal(body.commits[0].message, "commit 2");
        assert.equal(body.commits[1].message, "commit 1");
    });

    it("allows any authenticated user to read a public repository history", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits`,
            otherToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.commits.length, 1);
    });

    it("returns 403 for a private repository history requested by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "a.txt", "one");
        await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits`,
            otherToken
        );

        assert.equal(response.status, 403);
    });
});

describe("single commit", () => {
    it("returns the commit with its changed files", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "README.md", "# Hello");
        await writeRepoFile(repo, "src/app.js", "console.log(1)");

        const created = await createCommitRequest(
            repo,
            { message: "Add files" },
            ownerToken
        );
        const commit = await created.json();

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits/${commit.id}`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.id, commit.id);
        assert.equal(body.message, "Add files");
        assert.equal(body.author.name, "owneruser");
        assert.equal(typeof body.timestamp, "number");
        assert.equal(body.parent, null);
        assert.deepEqual(body.files, [
            { path: "README.md", status: "A" },
            { path: "src/app.js", status: "A" }
        ]);
    });

    it("returns 400 for an invalid commit ID", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits/zzzz`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a commit ID that is too short", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits/ab`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a path traversal commit ID", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits/%2e%2e%2f%2e%2e%2fetc`,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 for a missing commit", async () => {
        const repo = await createRepo("myrepo");
        const missingId = crypto.randomBytes(6).toString("hex");

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits/${missingId}`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 500 for corrupted commit metadata", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");

        const created = await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );
        const commit = await created.json();

        await fs.promises.writeFile(
            path.join(
                repoRoot(repo),
                ".CommitHub",
                "commits",
                commit.id,
                "meta.json"
            ),
            "{not valid json"
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/commits/${commit.id}`,
            ownerToken
        );

        assert.equal(response.status, 500);
    });
});

describe("working tree changes", () => {
    it("reports added, modified, and deleted files", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "keep.txt", "keep");
        await writeRepoFile(repo, "old.txt", "old");

        await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );

        await writeRepoFile(repo, "keep.txt", "changed");
        await writeRepoFile(repo, "new.txt", "new");
        await removeRepoFile(repo, "old.txt");

        const response = await getRequest(
            `/api/repositories/${repo._id}/changes`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.deepEqual(body.changes, [
            { path: "keep.txt", status: "M" },
            { path: "new.txt", status: "A" },
            { path: "old.txt", status: "D" }
        ]);
    });

    it("reports an empty change list for a clean working tree", async () => {
        const repo = await createRepo("myrepo");

        const response = await getRequest(
            `/api/repositories/${repo._id}/changes`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.deepEqual(body.changes, []);
    });

    it("returns 403 for a private repository changes requested by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");

        const response = await getRequest(
            `/api/repositories/${repo._id}/changes`,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("recognizes a working-tree file named meta.json as committed", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "meta.json", "not commit metadata");

        await createCommitRequest(
            repo,
            { message: "first" },
            ownerToken
        );

        const response = await getRequest(
            `/api/repositories/${repo._id}/changes`,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.deepEqual(body.changes, []);
    });
});
