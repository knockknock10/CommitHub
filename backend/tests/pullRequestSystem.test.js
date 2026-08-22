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
import PullRequest from "../models/pullRequestModel.js";
import Activity from "../models/activityModel.js";
import Notification from "../models/notificationModel.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import { getRepoRoot } from "../utils/repoStorage.js";
import {
    fastForwardMerge
} from "../utils/repoVersion.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-pr-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_pr_test?");

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

const readRepoFile = async (repository, relativePath) =>
    fs.promises.readFile(
        path.join(repoRoot(repository), relativePath),
        "utf-8"
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

const branchRefPath = (repository, branch) =>
    path.join(
        repoRoot(repository),
        ".CommitHub",
        "refs",
        "heads",
        branch
    );

const headFilePath = (repository) =>
    path.join(
        repoRoot(repository),
        ".CommitHub",
        "HEAD"
    );

const readBranchRef = async (repository, branch) =>
    (
        await fs.promises.readFile(
            branchRefPath(repository, branch),
            "utf-8"
        )
    ).trim();

const commitHeadCommit = async (repository, message = "commit") => {
    await createCommitRequest(
        repository,
        { message },
        ownerToken
    );
};

const prListRequest = (repository, query, token) =>
    getRequest(
        `/api/repositories/${repository._id}/pull-requests${query ? `?${query}` : ""}`,
        token
    );

const prCreateRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests`,
        "POST",
        body,
        token
    );

const prDetailRequest = (repository, number, token) =>
    getRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}`,
        token
    );

const prCloseRequest = (repository, number, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/close`,
        "POST",
        {},
        token
    );

const prReopenRequest = (repository, number, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/reopen`,
        "POST",
        {},
        token
    );

const prReviewRequest = (repository, number, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/reviews`,
        "POST",
        body,
        token
    );

const prCommentRequest = (repository, number, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/comments`,
        "POST",
        body,
        token
    );

const prMergeRequest = (repository, number, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/merge`,
        "POST",
        {},
        token
    );

const setupFastForwardRepo = async () => {
    const repo = await createRepo("prrepo");
    await writeRepoFile(repo, "base.txt", "base");
    await commitHeadCommit(repo, "base");
    await createBranchRequest(repo, { name: "dev" }, ownerToken);
    await checkoutRequest(repo, { name: "dev" }, ownerToken);
    await writeRepoFile(repo, "feature.txt", "feature");
    await commitHeadCommit(repo, "dev work");
    await checkoutRequest(repo, { name: "main" }, ownerToken);
    return repo;
};

const addBranchWithCommit = async (repo, branchName) => {
    await createBranchRequest(repo, { name: branchName }, ownerToken);
    await checkoutRequest(repo, { name: branchName }, ownerToken);
    await writeRepoFile(repo, `${branchName}.txt`, branchName);
    await commitHeadCommit(repo, `${branchName} work`);
    await checkoutRequest(repo, { name: "main" }, ownerToken);
};

const openPullRequest = async (
    repo,
    {
        source = "dev",
        target = "main",
        title = "Add feature",
        description = "desc",
        token = ownerToken
    } = {}
) =>
    prCreateRequest(
        repo,
        { sourceBranch: source, targetBranch: target, title, description },
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
        Repository.deleteMany({}),
        PullRequest.deleteMany({}),
        Activity.deleteMany({}),
        Notification.deleteMany({})
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
        Repository.deleteMany({}),
        PullRequest.deleteMany({}),
        Activity.deleteMany({}),
        Notification.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });

    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("pull request creation", () => {
    it("returns 401 without a token", async () => {
        const repo = await setupFastForwardRepo();

        const response = await openPullRequest(repo, { token: null });

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await prCreateRequest(
            { _id: "not-an-id" },
            { sourceBranch: "dev", targetBranch: "main", title: "t" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await prCreateRequest(
            { _id: new mongoose.Types.ObjectId() },
            { sourceBranch: "dev", targetBranch: "main", title: "t" },
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 403 for a private repository by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const response = await openPullRequest(repo, { token: otherToken });

        assert.equal(response.status, 403);
    });

    it("returns 400 when the title is missing or empty", async () => {
        const repo = await setupFastForwardRepo();

        const missing = await openPullRequest(repo, { title: "" });
        const whitespace = await prCreateRequest(
            repo,
            { sourceBranch: "dev", targetBranch: "main", title: "   " },
            ownerToken
        );

        assert.equal(missing.status, 400);
        assert.equal(whitespace.status, 400);
    });

    it("returns 400 when branches are missing", async () => {
        const repo = await setupFastForwardRepo();

        const missing = await prCreateRequest(
            repo,
            { title: "t" },
            ownerToken
        );

        assert.equal(missing.status, 400);
    });

    it("returns 400 when source equals target", async () => {
        const repo = await setupFastForwardRepo();

        const response = await openPullRequest(repo, {
            source: "main",
            target: "main"
        });

        assert.equal(response.status, 400);
    });

    it("returns 400 when a branch does not exist", async () => {
        const repo = await setupFastForwardRepo();

        const response = await openPullRequest(repo, { source: "nope" });

        assert.equal(response.status, 400);
    });

    it("returns 400 for invalid branch names", async () => {
        const repo = await setupFastForwardRepo();

        const response = await openPullRequest(repo, { source: "bad name" });

        assert.equal(response.status, 400);
    });

    it("returns 400 when a branch has no commits", async () => {
        const repo = await setupFastForwardRepo();
        await fs.promises.writeFile(branchRefPath(repo, "empty"), "");

        const response = await openPullRequest(repo, { source: "empty" });

        assert.equal(response.status, 400);

        const body = await response.json();

        assert.ok(body.message.includes("no commits"));
    });

    it("returns 400 when the repository has no commits at all", async () => {
        const repo = await createRepo("emptyrepo");

        const response = await openPullRequest(repo, {
            source: "main",
            target: "main"
        });

        assert.equal(response.status, 400);
    });

    it("creates a pull request with the author from the token", async () => {
        const repo = await setupFastForwardRepo();

        const response = await openPullRequest(repo, {
            title: "Add feature",
            description: "The description"
        });

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.equal(body.number, 1);
        assert.equal(body.title, "Add feature");
        assert.equal(body.description, "The description");
        assert.equal(body.sourceBranch, "dev");
        assert.equal(body.targetBranch, "main");
        assert.equal(body.status, "open");
        assert.equal(body.author.userName, "owneruser");
        assert.equal(body.repository, repo._id.toString());
    });

    it("numbers pull requests sequentially within a repository", async () => {
        const repo = await setupFastForwardRepo();
        await addBranchWithCommit(repo, "dev2");

        const first = await openPullRequest(repo, { title: "one" });
        const second = await openPullRequest(repo, {
            source: "dev2",
            title: "two"
        });

        assert.equal((await first.json()).number, 1);
        assert.equal((await second.json()).number, 2);
    });

    it("numbers pull requests per repository", async () => {
        const repoA = await setupFastForwardRepo();
        const repoB = await setupFastForwardRepo();

        await openPullRequest(repoA, { title: "a" });
        const response = await openPullRequest(repoB, { title: "b" });

        assert.equal((await response.json()).number, 1);
    });

    it("does not burn a number when a create request is rejected", async () => {
        const repo = await setupFastForwardRepo();
        await addBranchWithCommit(repo, "dev2");

        await openPullRequest(repo, { title: "one" });
        await openPullRequest(repo, { source: "nope", title: "rejected" });

        const response = await openPullRequest(repo, {
            source: "dev2",
            title: "three"
        });

        assert.equal((await response.json()).number, 2);
    });

    it("allocates distinct numbers under concurrent creation", async () => {
        const repo = await setupFastForwardRepo();
        await addBranchWithCommit(repo, "dev2");

        const [a, b] = await Promise.all([
            openPullRequest(repo, { title: "a" }),
            openPullRequest(repo, { source: "dev2", title: "b" })
        ]);

        const numbers = [
            (await a.json()).number,
            (await b.json()).number
        ].sort();

        assert.deepEqual(numbers, [1, 2]);
    });

    it("allows only one open pull request under concurrent duplicate creation", async () => {
        const repo = await setupFastForwardRepo();

        const [a, b] = await Promise.all([
            openPullRequest(repo, { title: "a" }),
            openPullRequest(repo, { title: "b" })
        ]);

        const statuses = [a.status, b.status].sort();

        assert.deepEqual(statuses, [201, 400]);

        const stored = await PullRequest.find({
            repository: repo._id
        });

        assert.equal(stored.length, 1);
    });

    it("allows an authenticated user to open a pull request on a public repository", async () => {
        const repo = await setupFastForwardRepo();

        const response = await openPullRequest(repo, { token: otherToken });

        assert.equal(response.status, 201);
    });

    it("does not duplicate commit history into the pull request document", async () => {
        const repo = await setupFastForwardRepo();
        await openPullRequest(repo);

        const stored = await PullRequest.findOne({
            repository: repo._id
        });

        assert.equal(stored.number, 1);
        assert.deepEqual(stored.reviews, []);
        assert.deepEqual(stored.comments, []);
        assert.equal(stored.mergedAt, null);
        assert.equal(stored.mergeCommitId, null);
        assert.equal(stored.hasOwnProperty("commits"), false);
        assert.equal(stored.status, "open");
    });
});

describe("pull request listing", () => {
    it("returns 401 without a token", async () => {
        const repo = await setupFastForwardRepo();
        await openPullRequest(repo);

        const response = await prListRequest(repo, "", null);

        assert.equal(response.status, 401);
    });

    it("returns 403 for a private repository by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const response = await prListRequest(repo, "", otherToken);

        assert.equal(response.status, 403);
    });

    it("lists pull requests newest first", async () => {
        const repo = await setupFastForwardRepo();
        await addBranchWithCommit(repo, "dev2");
        await openPullRequest(repo, { title: "one" });
        await openPullRequest(repo, { source: "dev2", title: "two" });

        const response = await prListRequest(repo, "", ownerToken);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.total, 2);
        assert.equal(body.pullRequests[0].title, "two");
        assert.equal(body.pullRequests[1].title, "one");
    });

    it("filters by status", async () => {
        const repo = await setupFastForwardRepo();
        await addBranchWithCommit(repo, "dev2");
        await openPullRequest(repo, { title: "one" });
        const second = await openPullRequest(repo, {
            source: "dev2",
            title: "two"
        });
        await prCloseRequest(repo, (await second.json()).number, ownerToken);

        const open = await prListRequest(repo, "status=open", ownerToken);
        const openBody = await open.json();

        assert.equal(openBody.total, 1);
        assert.equal(openBody.pullRequests[0].title, "one");

        const closed = await prListRequest(repo, "status=closed", ownerToken);
        const closedBody = await closed.json();

        assert.equal(closedBody.total, 1);
        assert.equal(closedBody.pullRequests[0].title, "two");
    });

    it("returns 400 for an invalid status filter", async () => {
        const repo = await setupFastForwardRepo();
        await openPullRequest(repo);

        const response = await prListRequest(repo, "status=sideways", ownerToken);

        assert.equal(response.status, 400);
    });

    it("paginates the listing", async () => {
        const repo = await setupFastForwardRepo();

        for (let index = 1; index <= 3; index += 1) {
            const branch = `dev-${index}`;
            await createBranchRequest(repo, { name: branch }, ownerToken);
            await checkoutRequest(repo, { name: branch }, ownerToken);
            await writeRepoFile(repo, `${branch}.txt`, branch);
            await commitHeadCommit(repo, `${branch} work`);
            await checkoutRequest(repo, { name: "main" }, ownerToken);
            await openPullRequest(repo, {
                source: branch,
                title: `pr ${index}`
            });
        }

        const page = await prListRequest(repo, "page=2&limit=2", ownerToken);
        const body = await page.json();

        assert.equal(body.page, 2);
        assert.equal(body.limit, 2);
        assert.equal(body.pages, 2);
        assert.equal(body.pullRequests.length, 1);
        assert.equal(body.pullRequests[0].title, "pr 1");
    });

    it("keeps the listing lean without comments or reviews", async () => {
        const repo = await setupFastForwardRepo();
        await openPullRequest(repo);

        const response = await prListRequest(repo, "", ownerToken);
        const body = await response.json();

        assert.equal(body.pullRequests[0].hasOwnProperty("comments"), false);
        assert.equal(body.pullRequests[0].hasOwnProperty("reviews"), false);
    });
});

describe("pull request detail", () => {
    it("returns 401 without a token", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);

        const response = await prDetailRequest(
            repo,
            (await created.json()).number,
            null
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid number", async () => {
        const repo = await setupFastForwardRepo();

        const response = await prDetailRequest(repo, "abc", ownerToken);

        assert.equal(response.status, 400);
    });

    it("returns 404 when the pull request does not exist", async () => {
        const repo = await setupFastForwardRepo();

        const response = await prDetailRequest(repo, 42, ownerToken);

        assert.equal(response.status, 404);
    });

    it("returns 403 for a private repository by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        const created = await openPullRequest(repo);

        assert.equal(created.status, 201);

        const response = await prDetailRequest(
            repo,
            (await created.json()).number,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns metadata, commits, and diff for the pull request", async () => {
        const repo = await createRepo("diffrepo");
        await writeRepoFile(repo, "notes.txt", "one\ntwo\nthree\n");
        await writeRepoFile(repo, "obsolete.txt", "old\n");
        await commitHeadCommit(repo, "base");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(
            repo,
            "notes.txt",
            "one\ntwo\nTWO-point-five\nthree\nfour\n"
        );
        await writeRepoFile(repo, "extra.txt", "hello\nworld\n");
        await fs.promises.rm(path.join(repoRoot(repo), "obsolete.txt"));
        await commitHeadCommit(repo, "dev work");
        await checkoutRequest(repo, { name: "main" }, ownerToken);

        const created = await openPullRequest(repo, { title: "Diff me" });
        const response = await prDetailRequest(
            repo,
            (await created.json()).number,
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.title, "Diff me");
        assert.equal(body.author.userName, "owneruser");
        assert.equal(body.sourceBranch, "dev");
        assert.equal(body.targetBranch, "main");
        assert.equal(body.commits.length, 1);
        assert.equal(body.commits[0].message, "dev work");

        const files = body.diff.files;
        const extra = files.find((file) => file.path === "extra.txt");
        const notes = files.find((file) => file.path === "notes.txt");
        const obsolete = files.find((file) => file.path === "obsolete.txt");

        assert.equal(extra.status, "A");
        assert.equal(extra.additions, 2);
        assert.equal(extra.hunks.length, 1);
        assert.equal(extra.hunks[0].newLines, 2);
        assert.ok(
            extra.hunks[0].lines.every((line) => line.type === "add")
        );

        assert.equal(notes.status, "M");
        assert.equal(notes.additions, 2);
        assert.equal(notes.deletions, 0);
        assert.ok(notes.hunks.length >= 1);
        assert.ok(
            notes.hunks[0].lines.some((line) => line.type === "add")
        );

        assert.equal(obsolete.status, "D");
        assert.equal(obsolete.deletions, 1);
        assert.ok(
            obsolete.hunks[0].lines.every((line) => line.type === "del")
        );

        assert.ok(body.diff.stats.added >= 1);
        assert.ok(body.diff.stats.modified >= 1);
        assert.ok(body.diff.stats.deleted >= 1);
    });

    it("returns reviews and comments with author details", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prReviewRequest(
            repo,
            number,
            { state: "approved", comment: "looks good" },
            otherToken
        );
        await prCommentRequest(
            repo,
            number,
            { content: "first comment" },
            otherToken
        );

        const response = await prDetailRequest(repo, number, ownerToken);
        const body = await response.json();

        assert.equal(body.reviews.length, 1);
        assert.equal(body.reviews[0].state, "approved");
        assert.equal(body.reviews[0].comment, "looks good");
        assert.equal(body.reviews[0].reviewer.userName, "otheruser");

        assert.equal(body.comments.length, 1);
        assert.equal(body.comments[0].content, "first comment");
        assert.equal(body.comments[0].author.userName, "otheruser");
    });

    it("still returns the pull request when its source branch is deleted", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await fs.promises.rm(branchRefPath(repo, "dev"));

        const response = await prDetailRequest(repo, number, ownerToken);

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.sourceBranchExists, false);
        assert.equal(body.sourceCommitId, null);
        assert.equal(body.commits.length, 0);
    });
});

describe("pull request close and reopen", () => {
    it("returns 401 without a token", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);

        const response = await prCloseRequest(
            repo,
            (await created.json()).number,
            null
        );

        assert.equal(response.status, 401);
    });

    it("lets the author close their own pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prCloseRequest(repo, number, ownerToken);

        assert.equal(response.status, 200);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number
        });

        assert.equal(stored.status, "closed");
    });

    it("lets the owner close a pull request opened by someone else", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo, { token: otherToken });
        const number = (await created.json()).number;

        const response = await prCloseRequest(repo, number, ownerToken);

        assert.equal(response.status, 200);
    });

    it("rejects closing by a non-author non-owner", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prCloseRequest(repo, number, otherToken);

        assert.equal(response.status, 403);
    });

    it("returns 404 for a missing pull request", async () => {
        const repo = await setupFastForwardRepo();

        const response = await prCloseRequest(repo, 42, ownerToken);

        assert.equal(response.status, 404);
    });

    it("rejects closing an already closed pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prCloseRequest(repo, number, ownerToken);
        const response = await prCloseRequest(repo, number, ownerToken);

        assert.equal(response.status, 400);
    });

    it("rejects closing a merged pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prMergeRequest(repo, number, ownerToken);
        const response = await prCloseRequest(repo, number, ownerToken);

        assert.equal(response.status, 400);
    });

    it("reopens a closed pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prCloseRequest(repo, number, ownerToken);
        const response = await prReopenRequest(repo, number, ownerToken);

        assert.equal(response.status, 200);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number
        });

        assert.equal(stored.status, "open");
    });

    it("rejects reopening an open pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prReopenRequest(repo, number, ownerToken);

        assert.equal(response.status, 400);
    });

    it("rejects reopening a merged pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prMergeRequest(repo, number, ownerToken);
        const response = await prReopenRequest(repo, number, ownerToken);

        assert.equal(response.status, 400);
    });
});

describe("pull request reviews", () => {
    it("returns 401 without a token", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);

        const response = await prReviewRequest(
            repo,
            (await created.json()).number,
            { state: "approved" },
            null
        );

        assert.equal(response.status, 401);
    });

    it("rejects reviewing your own pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prReviewRequest(
            repo,
            number,
            { state: "approved" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("allows any authenticated viewer to review a public pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prReviewRequest(
            repo,
            number,
            { state: "changes_requested", comment: "please adjust" },
            otherToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.equal(body.state, "changes_requested");
        assert.equal(body.comment, "please adjust");
        assert.equal(body.reviewer.userName, "otheruser");
    });

    it("returns 403 for reviews on a private repository by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prReviewRequest(
            repo,
            number,
            { state: "approved" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 400 for an invalid review state", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prReviewRequest(
            repo,
            number,
            { state: "amazing" },
            otherToken
        );

        assert.equal(response.status, 400);
    });

    it("stores the reviewer from the token, never from the body", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prReviewRequest(
            repo,
            number,
            { state: "commented", comment: "nick", reviewer: owner._id },
            otherToken
        );

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number
        });

        assert.equal(
            stored.reviews[0].reviewer.toString(),
            other._id.toString()
        );
    });
});

describe("pull request comments", () => {
    it("returns 401 without a token", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);

        const response = await prCommentRequest(
            repo,
            (await created.json()).number,
            { content: "hi" },
            null
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 when content is missing or empty", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const missing = await prCommentRequest(repo, number, {}, otherToken);
        const empty = await prCommentRequest(
            repo,
            number,
            { content: "   " },
            otherToken
        );

        assert.equal(missing.status, 400);
        assert.equal(empty.status, 400);
    });

    it("stores the author from the token", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prCommentRequest(
            repo,
            number,
            { content: "hello", author: owner._id },
            otherToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.equal(body.author.userName, "otheruser");
    });

    it("returns 403 for comments on a private repository by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prCommentRequest(
            repo,
            number,
            { content: "hello" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("keeps comments ordered oldest first in the detail view", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prCommentRequest(repo, number, { content: "first" }, otherToken);
        await prCommentRequest(repo, number, { content: "second" }, otherToken);

        const response = await prDetailRequest(repo, number, ownerToken);
        const body = await response.json();

        assert.deepEqual(
            body.comments.map((comment) => comment.content),
            ["first", "second"]
        );
    });
});

describe("pull request merge", () => {
    it("returns 401 without a token", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);

        const response = await prMergeRequest(
            repo,
            (await created.json()).number,
            null
        );

        assert.equal(response.status, 401);
    });

    it("returns 403 for a non-owner even on a public repository", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prMergeRequest(repo, number, otherToken);

        assert.equal(response.status, 403);
    });

    it("returns 404 for a missing pull request", async () => {
        const repo = await setupFastForwardRepo();

        const response = await prMergeRequest(repo, 42, ownerToken);

        assert.equal(response.status, 404);
    });

    it("rejects merging a closed pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prCloseRequest(repo, number, ownerToken);
        const response = await prMergeRequest(repo, number, ownerToken);

        assert.equal(response.status, 400);
    });

    it("rejects merging an already merged pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prMergeRequest(repo, number, ownerToken);
        const response = await prMergeRequest(repo, number, ownerToken);

        assert.equal(response.status, 409);
    });

    it("fast-forwards the target branch ref to the source commit", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const detail = await prDetailRequest(repo, number, ownerToken);
        const detailBody = await detail.json();
        const sourceCommitId = detailBody.sourceCommitId;

        const response = await prMergeRequest(repo, number, ownerToken);

        assert.equal(response.status, 200);

        assert.equal(await readBranchRef(repo, "main"), sourceCommitId);
    });

    it("marks the pull request merged with metadata", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const detail = await prDetailRequest(repo, number, ownerToken);
        const detailBody = await detail.json();

        await prMergeRequest(repo, number, ownerToken);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number
        });

        assert.equal(stored.status, "merged");
        assert.equal(stored.mergedBy.toString(), owner._id.toString());
        assert.equal(stored.mergeSourceCommitId, detailBody.sourceCommitId);
        assert.equal(stored.mergeCommitId, detailBody.sourceCommitId);
        assert.ok(stored.mergedAt instanceof Date);
    });

    it("updates the working tree when the target branch is checked out", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prMergeRequest(repo, number, ownerToken);

        assert.equal(
            await readRepoFile(repo, "feature.txt"),
            "feature"
        );
        assert.equal(
            (
                await fs.promises.readFile(
                    headFilePath(repo),
                    "utf-8"
                )
            ).trim(),
            "ref: refs/heads/main"
        );
    });

    it("does not touch the working tree when the target is not checked out", async () => {
        const repo = await setupFastForwardRepo();
        await checkoutRequest(repo, { name: "dev" }, ownerToken);

        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prMergeRequest(repo, number, ownerToken);

        assert.equal(
            await readRepoFile(repo, "feature.txt"),
            "feature"
        );
        assert.equal(
            (
                await fs.promises.readFile(
                    headFilePath(repo),
                    "utf-8"
                )
            ).trim(),
            "ref: refs/heads/dev"
        );
        assert.equal(
            await readBranchRef(repo, "main"),
            await readBranchRef(repo, "dev")
        );
    });

    it("returns 400 when the source branch no longer exists", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await fs.promises.rm(branchRefPath(repo, "dev"));

        const response = await prMergeRequest(repo, number, ownerToken);

        assert.equal(response.status, 400);
    });

    it("creates a merge commit when branches have diverged", async () => {
        const repo = await setupFastForwardRepo();
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "dev2.txt", "dev2");
        await commitHeadCommit(repo, "more dev work");
        await checkoutRequest(repo, { name: "main" }, ownerToken);
        await writeRepoFile(repo, "main2.txt", "main2");
        await commitHeadCommit(repo, "main work");

        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const before = await readBranchRef(repo, "main");

        const response = await prMergeRequest(repo, number, ownerToken);

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.merged, true);
        assert.equal(body.fastForward, false);
        assert.ok(body.mergeCommitId);
        assert.notEqual(body.mergeCommitId, before);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number
        });

        assert.equal(stored.status, "merged");
        assert.ok(stored.mergeCommitId);
        assert.ok(stored.mergedAt instanceof Date);
        assert.equal(stored.mergedBy.toString(), owner._id.toString());
    });

    it("marks PR merged when source is already behind target", async () => {
        const repo = await createRepo("uprepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo, "base");
        await writeRepoFile(repo, "b.txt", "two");
        await commitHeadCommit(repo, "main second");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "c.txt", "three");
        await commitHeadCommit(repo, "main third");

        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prMergeRequest(repo, number, ownerToken);

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.merged, true);
        assert.equal(body.alreadyUpToDate, true);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number
        });

        assert.equal(stored.status, "merged");
        assert.ok(stored.mergedAt instanceof Date);
        assert.equal(stored.mergedBy.toString(), owner._id.toString());
    });

    it("heals a partial merge where the target ref already advanced", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const detail = await prDetailRequest(repo, number, ownerToken);
        const detailBody = await detail.json();
        const sourceCommitId = detailBody.sourceCommitId;

        await fs.promises.writeFile(
            branchRefPath(repo, "main"),
            sourceCommitId
        );

        const response = await prMergeRequest(repo, number, ownerToken);

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.alreadyUpToDate, true);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number
        });

        assert.equal(stored.status, "merged");
        assert.equal(stored.mergeCommitId, sourceCommitId);
    });
});

describe("merge service edge cases", () => {
    const repoRootFor = (repository) => repoRoot(repository);

    it("throws BRANCH_HAS_NO_COMMITS when a branch ref is empty", async () => {
        const repo = await setupFastForwardRepo();
        await fs.promises.writeFile(branchRefPath(repo, "empty"), "");

        await assert.rejects(
            fastForwardMerge(
                repoRootFor(repo),
                "empty",
                "main"
            ),
            (error) => error.code === "BRANCH_HAS_NO_COMMITS"
        );
    });

    it("throws BRANCH_NOT_FOUND when a branch is missing", async () => {
        const repo = await setupFastForwardRepo();

        await assert.rejects(
            fastForwardMerge(
                repoRootFor(repo),
                "missing",
                "main"
            ),
            (error) => error.code === "BRANCH_NOT_FOUND"
        );
    });

    it("throws SAME_BRANCH when source and target are equal", async () => {
        const repo = await setupFastForwardRepo();

        await assert.rejects(
            fastForwardMerge(
                repoRootFor(repo),
                "main",
                "main"
            ),
            (error) => error.code === "SAME_BRANCH"
        );
    });

    it("throws INVALID_BRANCH_NAME for malformed names", async () => {
        const repo = await setupFastForwardRepo();

        await assert.rejects(
            fastForwardMerge(
                repoRootFor(repo),
                "bad name",
                "main"
            ),
            (error) => error.code === "INVALID_BRANCH_NAME"
        );
    });

    it("throws DIRTY_TREE when merging into the checked-out branch with uncommitted changes", async () => {
        const repo = await setupFastForwardRepo();
        await writeRepoFile(repo, "dirty.txt", "uncommitted");

        await assert.rejects(
            fastForwardMerge(
                repoRootFor(repo),
                "dev",
                "main"
            ),
            (error) => error.code === "DIRTY_TREE"
        );

        assert.equal(
            await readRepoFile(repo, "dirty.txt"),
            "uncommitted"
        );
    });
});

describe("pull request duplicate prevention", () => {
    it("rejects a second open pull request for the same branch pair", async () => {
        const repo = await setupFastForwardRepo();
        await openPullRequest(repo);

        const response = await openPullRequest(repo);

        assert.equal(response.status, 400);
        assert.match(
            (await response.json()).message,
            /already exists/
        );
    });

    it("allows a new pull request for the same branch pair after the first is merged", async () => {
        const repo = await setupFastForwardRepo();
        const first = await openPullRequest(repo);
        const number = (await first.json()).number;

        await prMergeRequest(repo, number, ownerToken);

        const second = await openPullRequest(repo);

        assert.equal(second.status, 201);
    });

    it("allows a new pull request for the same branch pair after the first is closed", async () => {
        const repo = await setupFastForwardRepo();
        const first = await openPullRequest(repo);
        const number = (await first.json()).number;

        await prCloseRequest(repo, number, ownerToken);

        const second = await openPullRequest(repo);

        assert.equal(second.status, 201);
    });

    it("does not burn a number when a duplicate is rejected", async () => {
        const repo = await setupFastForwardRepo();
        const first = await openPullRequest(repo);
        const firstNumber = (await first.json()).number;

        await openPullRequest(repo);

        const list = await prListRequest(repo, "", ownerToken);
        const body = await list.json();

        assert.equal(body.total, 1);
        assert.equal(body.pullRequests[0].number, firstNumber);
    });

    it("treats a reopened pull request as a duplicate while it is open", async () => {
        const repo = await setupFastForwardRepo();
        const first = await openPullRequest(repo);
        const number = (await first.json()).number;

        await prCloseRequest(repo, number, ownerToken);
        await prReopenRequest(repo, number, ownerToken);

        const second = await openPullRequest(repo);

        assert.equal(second.status, 400);
    });

    it("rejects reopening a closed pull request when another open PR holds the branch pair", async () => {
        const repo = await setupFastForwardRepo();
        const first = await openPullRequest(repo);
        const firstNumber = (await first.json()).number;

        await prCloseRequest(repo, firstNumber, ownerToken);

        const second = await openPullRequest(repo);

        assert.equal(second.status, 201);

        const response = await prReopenRequest(
            repo,
            firstNumber,
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.match(
            (await response.json()).message,
            /already exists/
        );
    });
});

describe("pull request update", () => {
    it("updates the title and description as the author", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/pull-requests/${number}`,
            "PATCH",
            { title: "Renamed", description: "new desc" },
            ownerToken
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.title, "Renamed");
        assert.equal(body.description, "new desc");
    });

    it("updates a pull request as the repository owner", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo, {
            token: otherToken
        });
        const number = (await created.json()).number;

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/pull-requests/${number}`,
            "PATCH",
            { title: "Owner edit" },
            ownerToken
        );

        assert.equal(response.status, 200);
        assert.equal((await response.json()).title, "Owner edit");
    });

    it("rejects updates from a non-author non-owner", async () => {
        const intruder = await User.create({
            userName: "intruder",
            email: "intruder@test.com",
            password: await bcrypt.hash("password123", 10)
        });
        const intruderToken = tokenFor(intruder._id);

        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo, {
            token: otherToken
        });
        const number = (await created.json()).number;

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/pull-requests/${number}`,
            "PATCH",
            { title: "Hijacked" },
            intruderToken
        );

        assert.equal(response.status, 403);
    });
});

describe("pull request review state", () => {
    it("is pending when there are no reviews", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        const response = await prDetailRequest(
            repo,
            number,
            ownerToken
        );

        assert.equal((await response.json()).reviewState, "pending");
    });

    it("becomes approved after an approved review", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prReviewRequest(
            repo,
            number,
            { state: "approved", comment: "looks good" },
            otherToken
        );

        const response = await prDetailRequest(
            repo,
            number,
            ownerToken
        );

        assert.equal((await response.json()).reviewState, "approved");
    });

    it("changes_requested wins over a later approval", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prReviewRequest(
            repo,
            number,
            { state: "changes_requested", comment: "fix x" },
            otherToken
        );
        await prReviewRequest(
            repo,
            number,
            { state: "approved", comment: "ok now" },
            otherToken
        );

        const response = await prDetailRequest(
            repo,
            number,
            ownerToken
        );

        assert.equal(
            (await response.json()).reviewState,
            "changes_requested"
        );
    });

    it("exposes reviewState in the lean listing", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prReviewRequest(
            repo,
            number,
            { state: "approved", comment: "nice" },
            otherToken
        );

        const response = await prListRequest(repo, "", ownerToken);
        const body = await response.json();

        assert.equal(body.pullRequests[0].reviewState, "approved");
        assert.equal(
            body.pullRequests[0].hasOwnProperty("reviews"),
            false
        );
        assert.equal(
            body.pullRequests[0].hasOwnProperty("comments"),
            false
        );
    });
});

describe("pull request close and reopen activity", () => {
    it("records PR_CLOSED activity when a pull request is closed", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo, {
            token: otherToken
        });
        const number = (await created.json()).number;

        await prCloseRequest(repo, number, ownerToken);

        const activities = await Activity.find({
            type: "PR_CLOSED"
        });

        assert.equal(activities.length, 1);
        assert.equal(
            activities[0].actor.toString(),
            owner._id.toString()
        );
        assert.equal(
            activities[0].repository.toString(),
            repo._id.toString()
        );
        assert.equal(
            activities[0].metadata.pullRequestNumber,
            number
        );
    });

    it("notifies the author when the owner closes their pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo, {
            token: otherToken
        });
        const number = (await created.json()).number;

        await prCloseRequest(repo, number, ownerToken);

        const notifications = await Notification.find({
            type: "PR_CLOSED"
        });

        assert.equal(notifications.length, 1);
        assert.equal(
            notifications[0].recipient.toString(),
            other._id.toString()
        );
        assert.match(
            notifications[0].message,
            new RegExp(`#${number}`)
        );
    });

    it("does not notify the author when they close their own pull request", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prCloseRequest(repo, number, ownerToken);

        const notifications = await Notification.find({
            type: "PR_CLOSED"
        });

        assert.equal(notifications.length, 0);
    });

    it("records PR_REOPENED activity when a pull request is reopened", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prCloseRequest(repo, number, ownerToken);
        await prReopenRequest(repo, number, ownerToken);

        const activities = await Activity.find({
            type: "PR_REOPENED"
        });

        assert.equal(activities.length, 1);
        assert.equal(
            activities[0].metadata.pullRequestNumber,
            number
        );
    });
});

describe("pull request activity and notification generation", () => {
    it("records PR_CREATED activity and notifies the owner when a contributor opens a PR", async () => {
        const repo = await setupFastForwardRepo();

        await openPullRequest(repo, { token: otherToken });

        const activities = await Activity.find({
            type: "PR_CREATED"
        });

        assert.equal(activities.length, 1);
        assert.equal(
            activities[0].actor.toString(),
            other._id.toString()
        );
        assert.equal(
            activities[0].repository.toString(),
            repo._id.toString()
        );
        assert.equal(
            activities[0].metadata.pullRequestNumber,
            1
        );

        const notifications = await Notification.find({
            type: "PR_CREATED"
        });

        assert.equal(notifications.length, 1);
        assert.equal(
            notifications[0].recipient.toString(),
            owner._id.toString()
        );
        assert.match(notifications[0].message, /#1/);
    });

    it("does not notify the owner when they open their own pull request", async () => {
        const repo = await setupFastForwardRepo();

        await openPullRequest(repo);

        const activities = await Activity.find({
            type: "PR_CREATED"
        });

        assert.equal(activities.length, 1);

        const notifications = await Notification.find({
            type: "PR_CREATED"
        });

        assert.equal(notifications.length, 0);
    });

    it("records PR_REVIEWED activity and notifies the author when reviewed", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo);
        const number = (await created.json()).number;

        await prReviewRequest(
            repo,
            number,
            { state: "approved", comment: "looks good" },
            otherToken
        );

        const activities = await Activity.find({
            type: "PR_REVIEWED"
        });

        assert.equal(activities.length, 1);
        assert.equal(
            activities[0].actor.toString(),
            other._id.toString()
        );
        assert.equal(activities[0].metadata.reviewState, "approved");

        const notifications = await Notification.find({
            type: "PR_REVIEWED"
        });

        assert.equal(notifications.length, 1);
        assert.equal(
            notifications[0].recipient.toString(),
            owner._id.toString()
        );
        assert.match(notifications[0].message, /#1/);
    });

    it("records PR_MERGED activity and notifies the author when merged", async () => {
        const repo = await setupFastForwardRepo();
        const created = await openPullRequest(repo, {
            token: otherToken
        });
        const number = (await created.json()).number;

        await prMergeRequest(repo, number, ownerToken);

        const activities = await Activity.find({
            type: "PR_MERGED"
        });

        assert.equal(activities.length, 1);
        assert.equal(
            activities[0].actor.toString(),
            owner._id.toString()
        );
        assert.equal(
            activities[0].metadata.pullRequestNumber,
            number
        );

        const notifications = await Notification.find({
            type: "PR_MERGED"
        });

        assert.equal(notifications.length, 1);
        assert.equal(
            notifications[0].recipient.toString(),
            other._id.toString()
        );
        assert.match(
            notifications[0].message,
            new RegExp(`#${number}`)
        );
    });
});
