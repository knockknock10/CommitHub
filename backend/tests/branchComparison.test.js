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
import { getRepoRoot } from "../utils/repoStorage.js";
import {
    ensureVersionControl,
    createBranch,
    checkoutBranch
} from "../utils/repoVersion.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-compare-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_compare_test?");

const app = express();

app.use(express.json());
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
let ownerToken;

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

const commitAll = async (repository, message, token) => {
    const response = await jsonRequest(
        `/api/repositories/${repository._id}/commits`,
        "POST",
        { message },
        token
    );
    return response.json();
};

const setupFeatureBranch = async (repo, branchName, token) => {
    await createBranch(repoRoot(repo), branchName);
    await repo.updateOne({ $push: { branches: branchName } });
    await checkoutBranch(repoRoot(repo), branchName, { force: true });
};

before(async () => {
    await mongoose.connect(mongoUri);
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;

    owner = await User.create({
        userName: "compareowner",
        email: "compare@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    ownerToken = tokenFor(owner._id);
});

after(async () => {
    await User.deleteMany({});
    await Repository.deleteMany({});
    await mongoose.disconnect();
    server.close();
    await fs.promises.rm(storageRoot, { recursive: true, force: true });
});

beforeEach(async () => {
    await User.deleteMany({});
    await Repository.deleteMany({});

    owner = await User.create({
        userName: "compareowner",
        email: "compare@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    ownerToken = tokenFor(owner._id);
});

const compareUrl = (repo, base, head) =>
    `/api/repositories/${repo._id}/compare?base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`;

describe("branch comparison", () => {
    describe("same branch / identical tips", () => {
        it("returns status identical when comparing a branch to itself", async () => {
            const repo = await createRepo("compare-self");
            await writeRepoFile(repo, "file.txt", "hello");
            await commitAll(repo, "initial commit", ownerToken);

            const res = await getRequest(
                compareUrl(repo, "main", "main"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "identical");
            assert.equal(body.ahead, 0);
            assert.equal(body.behind, 0);
            assert.equal(body.commitsAhead.length, 0);
            assert.equal(body.commitsBehind.length, 0);
            assert.equal(body.commonAncestor, body.base.commitId);
            assert.equal(body.base.branch, "main");
            assert.equal(body.head.branch, "main");
            assert.equal(body.base.commitId, body.head.commitId);
        });

        it("returns status identical when two branches point to the same commit", async () => {
            const repo = await createRepo("compare-same-tip");
            await writeRepoFile(repo, "a.txt", "content a");
            const firstResult = await commitAll(repo, "first", ownerToken);
            const firstCommitId = firstResult.id;

            await setupFeatureBranch(repo, "feature", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "identical");
            assert.equal(body.ahead, 0);
            assert.equal(body.behind, 0);
            assert.equal(body.base.commitId, firstCommitId);
            assert.equal(body.head.commitId, firstCommitId);
        });
    });

    describe("source ahead of target", () => {
        it("returns status ahead with correct commit count", async () => {
            const repo = await createRepo("compare-ahead");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "first", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "second");
            await commitAll(repo, "second", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "ahead");
            assert.equal(body.ahead, 1);
            assert.equal(body.behind, 0);
            assert.equal(body.commitsAhead.length, 1);
            assert.equal(body.commitsAhead[0].message, "second");
            assert.ok(body.diff);
            assert.ok(body.diff.files);
        });

        it("returns multiple ahead commits", async () => {
            const repo = await createRepo("compare-ahead-multi");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "first", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "second");
            await commitAll(repo, "second commit", ownerToken);

            await writeRepoFile(repo, "c.txt", "third");
            await commitAll(repo, "third commit", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "ahead");
            assert.equal(body.ahead, 2);
            assert.equal(body.behind, 0);
            assert.equal(body.commitsAhead.length, 2);
        });
    });

    describe("target ahead of source (behind)", () => {
        it("returns status behind with commitsBehind", async () => {
            const repo = await createRepo("compare-behind");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "first", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            await writeRepoFile(repo, "b.txt", "target change");
            await commitAll(repo, "target commit", ownerToken);

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "behind");
            assert.equal(body.ahead, 0);
            assert.equal(body.behind, 1);
            assert.equal(body.commitsBehind.length, 1);
        });
    });

    describe("diverged branches", () => {
        it("returns status diverged with both ahead and behind", async () => {
            const repo = await createRepo("compare-diverged");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "first", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            await writeRepoFile(repo, "b.txt", "target change");
            await commitAll(repo, "target commit", ownerToken);

            await checkoutBranch(repoRoot(repo), "feature", { force: true });

            await writeRepoFile(repo, "c.txt", "feature change");
            await commitAll(repo, "feature commit", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "diverged");
            assert.ok(body.ahead >= 1);
            assert.ok(body.behind >= 1);
            assert.ok(body.commonAncestor);
        });
    });

    describe("common ancestor", () => {
        it("returns the correct common ancestor for linear history", async () => {
            const repo = await createRepo("compare-ancestor");
            await writeRepoFile(repo, "a.txt", "initial");
            const firstResult = await commitAll(repo, "first", ownerToken);
            const firstCommitId = firstResult.id;

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "feature change");
            await commitAll(repo, "feature commit", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.commonAncestor, firstCommitId);
        });
    });

    describe("file-level diff", () => {
        it("includes diff with added files", async () => {
            const repo = await createRepo("compare-diff-add");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "first", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "new file");
            await commitAll(repo, "add file", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.ok(body.diff);
            assert.equal(body.diff.files.length, 1);
            assert.equal(body.diff.files[0].path, "b.txt");
            assert.equal(body.diff.files[0].status, "A");
        });

        it("includes diff with modified files", async () => {
            const repo = await createRepo("compare-diff-mod");
            await writeRepoFile(repo, "a.txt", "initial content");
            await commitAll(repo, "first", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "a.txt", "modified content");
            await commitAll(repo, "modify file", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.ok(body.diff);
            assert.equal(body.diff.files.length, 1);
            assert.equal(body.diff.files[0].path, "a.txt");
            assert.equal(body.diff.files[0].status, "M");
        });

        it("includes diff with deleted files", async () => {
            const repo = await createRepo("compare-diff-del");
            await writeRepoFile(repo, "a.txt", "content");
            await writeRepoFile(repo, "b.txt", "to delete");
            await commitAll(repo, "first", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await fs.promises.rm(
                path.join(repoRoot(repo), "b.txt"),
                { force: true }
            );
            await commitAll(repo, "delete file", ownerToken);

            await checkoutBranch(repoRoot(repo), "main", { force: true });

            const res = await getRequest(
                compareUrl(repo, "main", "feature"),
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.ok(body.diff);
            assert.equal(body.diff.files.length, 1);
            assert.equal(body.diff.files[0].path, "b.txt");
            assert.equal(body.diff.files[0].status, "D");
        });
    });

    describe("error cases", () => {
        it("returns 400 when base branch is missing", async () => {
            const repo = await createRepo("compare-no-base");
            const res = await getRequest(
                `/api/repositories/${repo._id}/compare?head=main`,
                ownerToken
            );
            assert.equal(res.status, 400);
        });

        it("returns 400 when head branch is missing", async () => {
            const repo = await createRepo("compare-no-head");
            const res = await getRequest(
                `/api/repositories/${repo._id}/compare?base=main`,
                ownerToken
            );
            assert.equal(res.status, 400);
        });

        it("returns 400 when head branch does not exist", async () => {
            const repo = await createRepo("compare-missing-head");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "first", ownerToken);

            const res = await getRequest(
                compareUrl(repo, "main", "nonexistent"),
                ownerToken
            );
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.ok(body.message.includes("nonexistent"));
        });

        it("returns 400 when base branch does not exist", async () => {
            const repo = await createRepo("compare-missing-base");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "first", ownerToken);

            const res = await getRequest(
                compareUrl(repo, "nonexistent", "main"),
                ownerToken
            );
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.ok(body.message.includes("nonexistent"));
        });

        it("returns 404 for nonexistent repository", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await getRequest(
                `/api/repositories/${fakeId}/compare?base=main&head=main`,
                ownerToken
            );
            assert.equal(res.status, 404);
        });

        it("returns 401 without authentication", async () => {
            const repo = await createRepo("compare-no-auth");
            const res = await request(
                compareUrl(repo, "main", "main")
            );
            assert.equal(res.status, 401);
        });
    });
});
