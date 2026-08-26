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
import ReviewComment from "../models/reviewCommentModel.js";
import Activity from "../models/activityModel.js";
import Notification from "../models/notificationModel.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import { getRepoRoot } from "../utils/repoStorage.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-review-comment-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace(
        "/commithub?",
        "/commithub_review_comment_test?"
    );

const app = express();

app.use(express.json());
app.use("/api/repositories", repositoryRoutes);

let server;
let baseUrl;

const tokenFor = (userId) =>
    jwt.sign(
        { id: userId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

const request = (urlPath, options = {}) =>
    fetch(`${baseUrl}${urlPath}`, options);

const jsonRequest = (urlPath, method, body, token) =>
    request(urlPath, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });

const getRequest = (urlPath, token) =>
    request(urlPath, {
        headers: token
            ? { Authorization: `Bearer ${token}` }
            : {}
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

const writeRepoFile = async (
    repository,
    relativePath,
    content
) => {
    const target = path.join(
        repoRoot(repository),
        relativePath
    );
    await fs.promises.mkdir(path.dirname(target), {
        recursive: true
    });
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

const commitHeadCommit = async (
    repository,
    message = "commit"
) => {
    await createCommitRequest(
        repository,
        { message },
        ownerToken
    );
};

const readBranchRef = async (repository, branch) => {
    const refPath = path.join(
        repoRoot(repository),
        ".CommitHub",
        "refs",
        "heads",
        branch
    );
    return (
        await fs.promises.readFile(refPath, "utf-8")
    ).trim();
};

const prCreateRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests`,
        "POST",
        body,
        token
    );

const rcBaseUrl = (repo, prNumber) =>
    `/api/repositories/${repo._id}/pull-requests/${prNumber}/review-comments`;

const rcCreate = (repo, prNumber, body, token) =>
    jsonRequest(rcBaseUrl(repo, prNumber), "POST", body, token);

const rcList = (repo, prNumber, query, token) =>
    getRequest(
        `${rcBaseUrl(repo, prNumber)}${query ? `?${query}` : ""}`,
        token
    );

const rcThread = (repo, prNumber, commentId, token) =>
    getRequest(
        `${rcBaseUrl(repo, prNumber)}/${commentId}`,
        token
    );

const rcReply = (repo, prNumber, commentId, body, token) =>
    jsonRequest(
        `${rcBaseUrl(repo, prNumber)}/${commentId}/reply`,
        "POST",
        body,
        token
    );

const rcResolve = (repo, prNumber, commentId, token) =>
    jsonRequest(
        `${rcBaseUrl(repo, prNumber)}/${commentId}/resolve`,
        "POST",
        {},
        token
    );

const rcUnresolve = (repo, prNumber, commentId, token) =>
    jsonRequest(
        `${rcBaseUrl(repo, prNumber)}/${commentId}/unresolve`,
        "POST",
        {},
        token
    );

const rcEdit = (repo, prNumber, commentId, body, token) =>
    jsonRequest(
        `${rcBaseUrl(repo, prNumber)}/${commentId}`,
        "PATCH",
        body,
        token
    );

const rcDelete = (repo, prNumber, commentId, token) =>
    jsonRequest(
        `${rcBaseUrl(repo, prNumber)}/${commentId}`,
        "DELETE",
        {},
        token
    );

const setupReviewRepo = async () => {
    const repo = await createRepo("reviewrepo");
    await writeRepoFile(repo, "src/app.js", "line1\nline2\nline3");
    await commitHeadCommit(repo, "initial");
    await createBranchRequest(
        repo,
        { name: "feature" },
        ownerToken
    );
    await checkoutRequest(
        repo,
        { name: "feature" },
        ownerToken
    );
    await writeRepoFile(
        repo,
        "src/app.js",
        "line1\nline2-new\nline3\nline4"
    );
    await commitHeadCommit(repo, "update app");
    await checkoutRequest(
        repo,
        { name: "main" },
        ownerToken
    );
    return repo;
};

const openPr = async (repo) => {
    const res = await prCreateRequest(
        repo,
        {
            sourceBranch: "feature",
            targetBranch: "main",
            title: "Update app",
            description: "test PR"
        },
        ownerToken
    );
    const data = await res.json();
    return data.pullRequest || data;
};

before(async () => {
    await mongoose.connect(mongoUri);
    server = app.listen(0);
    await new Promise((resolve) =>
        server.once("listening", resolve)
    );
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
    await Promise.all([
        User.deleteMany({}),
        Repository.deleteMany({}),
        PullRequest.deleteMany({}),
        ReviewComment.deleteMany({}),
        Activity.deleteMany({}),
        Notification.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, {
        recursive: true,
        force: true
    });
    await fs.promises.mkdir(storageRoot, {
        recursive: true
    });

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
        ReviewComment.deleteMany({}),
        Activity.deleteMany({}),
        Notification.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, {
        recursive: true,
        force: true
    });

    server.closeAllConnections();
    await new Promise((resolve) =>
        server.close(resolve)
    );
    await mongoose.disconnect();
});

describe("create review comment", () => {
    it("creates a comment on a file at a specific line", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const res = await rcCreate(
            repo,
            pr.number,
            {
                body: "This line needs a fix",
                commit,
                filePath: "src/app.js",
                line: 2
            },
            ownerToken
        );

        assert.equal(res.status, 201);
        const data = await res.json();
        assert.equal(data.body, "This line needs a fix");
        assert.equal(data.filePath, "src/app.js");
        assert.equal(data.line, 2);
        assert.equal(data.commit, commit);
        assert.equal(data.author.userName, "owneruser");
    });

    it("creates a file-level comment without a line number", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const res = await rcCreate(
            repo,
            pr.number,
            {
                body: "Overall file looks good",
                commit,
                filePath: "src/app.js"
            },
            ownerToken
        );

        assert.equal(res.status, 201);
        const data = await res.json();
        assert.equal(data.line, null);
    });

    it("returns 400 when body is missing", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const res = await rcCreate(
            repo,
            pr.number,
            { commit, filePath: "src/app.js", line: 1 },
            ownerToken
        );

        assert.equal(res.status, 400);
    });

    it("returns 400 when commit is missing", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);

        const res = await rcCreate(
            repo,
            pr.number,
            {
                body: "test",
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );

        assert.equal(res.status, 400);
    });

    it("returns 400 when filePath is missing", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const res = await rcCreate(
            repo,
            pr.number,
            { body: "test", commit, line: 1 },
            ownerToken
        );

        assert.equal(res.status, 400);
    });

    it("returns 400 when file does not exist at that commit", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const res = await rcCreate(
            repo,
            pr.number,
            {
                body: "test",
                commit,
                filePath: "nonexistent.js",
                line: 1
            },
            ownerToken
        );

        assert.equal(res.status, 400);
    });

    it("returns 400 when line number is out of range", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const res = await rcCreate(
            repo,
            pr.number,
            {
                body: "test",
                commit,
                filePath: "src/app.js",
                line: 999
            },
            ownerToken
        );

        assert.equal(res.status, 400);
    });

    it("returns 404 when PR does not exist", async () => {
        const repo = await setupReviewRepo();
        const commit = await readBranchRef(repo, "feature");

        const res = await rcCreate(
            repo,
            9999,
            {
                body: "test",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );

        assert.equal(res.status, 404);
    });

    it("returns 401 without a token", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const res = await rcCreate(repo, pr.number, {
            body: "test",
            commit,
            filePath: "src/app.js",
            line: 1
        });

        assert.equal(res.status, 401);
    });

    it("creates activity for root comments but not replies", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "root comment",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        const activities = await Activity.find({
            type: "PR_COMMENTED",
            pullRequest: pr._id
        });
        assert.equal(activities.length, 1);
        assert.equal(
            activities[0].metadata.filePath,
            "src/app.js"
        );

        const replyRes = await rcReply(
            repo,
            pr.number,
            root._id,
            { body: "reply" },
            ownerToken
        );
        assert.equal(replyRes.status, 201);

        const afterReply = await Activity.find({
            type: "PR_COMMENTED",
            pullRequest: pr._id
        });
        assert.equal(afterReply.length, 1);
    });
});

describe("list review comments", () => {
    it("lists all comments for a PR", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        await rcCreate(
            repo,
            pr.number,
            {
                body: "comment 1",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        await rcCreate(
            repo,
            pr.number,
            {
                body: "comment 2",
                commit,
                filePath: "src/app.js",
                line: 3
            },
            ownerToken
        );

        const res = await rcList(repo, pr.number, null, ownerToken);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.length, 2);
    });

    it("filters by filePath", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        await writeRepoFile(repo, "README.md", "# Hello");
        await rcCreate(
            repo,
            pr.number,
            {
                body: "app comment",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        await rcCreate(
            repo,
            pr.number,
            {
                body: "readme comment",
                commit,
                filePath: "README.md"
            },
            ownerToken
        );

        const res = await rcList(
            repo,
            pr.number,
            "filePath=src/app.js",
            ownerToken
        );
        const data = await res.json();
        assert.equal(data.length, 1);
        assert.equal(data[0].filePath, "src/app.js");
    });
});

describe("thread model", () => {
    it("returns root comment and its replies", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "question here",
                commit,
                filePath: "src/app.js",
                line: 2
            },
            ownerToken
        );
        const root = await rootRes.json();

        await rcReply(
            repo,
            pr.number,
            root._id,
            { body: "answer here" },
            otherToken
        );

        const threadRes = await rcThread(
            repo,
            pr.number,
            root._id,
            ownerToken
        );
        assert.equal(threadRes.status, 200);
        const thread = await threadRes.json();
        assert.equal(thread.comment.body, "question here");
        assert.equal(thread.replies.length, 1);
        assert.equal(thread.replies[0].body, "answer here");
        assert.equal(
            thread.replies[0].author.userName,
            "otheruser"
        );
    });

    it("returns 404 for non-existent comment", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);

        const res = await rcThread(
            repo,
            pr.number,
            new mongoose.Types.ObjectId().toString(),
            ownerToken
        );
        assert.equal(res.status, 404);
    });
});

describe("reply to review comment", () => {
    it("creates a reply to a root comment", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "issue here",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        const replyRes = await rcReply(
            repo,
            pr.number,
            root._id,
            { body: "I agree" },
            otherToken
        );

        assert.equal(replyRes.status, 201);
        const reply = await replyRes.json();
        assert.equal(reply.body, "I agree");
        assert.equal(reply.parentComment, root._id);
        assert.equal(reply.author.userName, "otheruser");
    });

    it("returns 400 when trying to nest replies", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "root",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        const replyRes = await rcReply(
            repo,
            pr.number,
            root._id,
            { body: "reply 1" },
            ownerToken
        );
        const reply = await replyRes.json();

        const nestedRes = await rcReply(
            repo,
            pr.number,
            reply._id,
            { body: "nested reply" },
            ownerToken
        );
        assert.equal(nestedRes.status, 400);
    });

    it("sends notification to PR author on reply", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "root",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            otherToken
        );
        const root = await rootRes.json();

        await rcReply(
            repo,
            pr.number,
            root._id,
            { body: "reply" },
            ownerToken
        );

        const notifs = await Notification.find({
            recipient: owner._id,
            type: "PR_COMMENTED"
        });
        assert.ok(notifs.length >= 1);
    });
});

describe("resolve and unresolve thread", () => {
    it("resolves a thread (owner only)", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "thread",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            otherToken
        );
        const root = await rootRes.json();

        const resolveRes = await rcResolve(
            repo,
            pr.number,
            root._id,
            ownerToken
        );
        assert.equal(resolveRes.status, 200);

        const data = await resolveRes.json();
        assert.equal(data.comment.resolved, true);
        assert.equal(data.comment.resolvedBy, owner._id.toString());
    });

    it("returns 403 when non-owner tries to resolve", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "thread",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        const resolveRes = await rcResolve(
            repo,
            pr.number,
            root._id,
            otherToken
        );
        assert.equal(resolveRes.status, 403);
    });

    it("returns 400 when resolving already resolved thread", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "thread",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        await rcResolve(repo, pr.number, root._id, ownerToken);

        const res = await rcResolve(
            repo,
            pr.number,
            root._id,
            ownerToken
        );
        assert.equal(res.status, 400);
    });

    it("returns 400 when trying to resolve a reply (non-root)", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "root",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        const replyRes = await rcReply(
            repo,
            pr.number,
            root._id,
            { body: "reply" },
            ownerToken
        );
        const reply = await replyRes.json();

        const resolveRes = await rcResolve(
            repo,
            pr.number,
            reply._id,
            ownerToken
        );
        assert.equal(resolveRes.status, 400);
    });

    it("unresolves a resolved thread", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "thread",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        await rcResolve(repo, pr.number, root._id, ownerToken);

        const unresolveRes = await rcUnresolve(
            repo,
            pr.number,
            root._id,
            ownerToken
        );
        assert.equal(unresolveRes.status, 200);
        const data = await unresolveRes.json();
        assert.equal(data.comment.resolved, false);
    });

    it("returns 400 when unresolved thread is already unresolved", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "thread",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        const res = await rcUnresolve(
            repo,
            pr.number,
            root._id,
            ownerToken
        );
        assert.equal(res.status, 400);
    });
});

describe("edit and delete review comment", () => {
    it("author can edit their own comment", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const createRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "original",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const comment = await createRes.json();

        const editRes = await rcEdit(
            repo,
            pr.number,
            comment._id,
            { body: "edited" },
            ownerToken
        );
        assert.equal(editRes.status, 200);
        const data = await editRes.json();
        assert.equal(data.body, "edited");
    });

    it("returns 403 when non-author tries to edit", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const createRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "original",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const comment = await createRes.json();

        const editRes = await rcEdit(
            repo,
            pr.number,
            comment._id,
            { body: "hacked" },
            otherToken
        );
        assert.equal(editRes.status, 403);
    });

    it("author can delete their own comment", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const createRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "to delete",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const comment = await createRes.json();

        const delRes = await rcDelete(
            repo,
            pr.number,
            comment._id,
            ownerToken
        );
        assert.equal(delRes.status, 200);

        const threadRes = await rcThread(
            repo,
            pr.number,
            comment._id,
            ownerToken
        );
        assert.equal(threadRes.status, 404);
    });

    it("repo owner can delete any comment", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const createRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "other's comment",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            otherToken
        );
        const comment = await createRes.json();

        const delRes = await rcDelete(
            repo,
            pr.number,
            comment._id,
            ownerToken
        );
        assert.equal(delRes.status, 200);
    });

    it("returns 403 when unauthorized user tries to delete", async () => {
        const repo = await createRepo("privrepo", "private");
        await writeRepoFile(repo, "f.txt", "content");
        await commitHeadCommit(repo, "init");
        await createBranchRequest(
            repo,
            { name: "patch" },
            ownerToken
        );
        await checkoutRequest(
            repo,
            { name: "patch" },
            ownerToken
        );
        await writeRepoFile(repo, "f.txt", "updated");
        await commitHeadCommit(repo, "patch");
        await checkoutRequest(
            repo,
            { name: "main" },
            ownerToken
        );

        const prRes = await prCreateRequest(
            repo,
            {
                sourceBranch: "patch",
                targetBranch: "main",
                title: "t"
            },
            ownerToken
        );
        const prData = await prRes.json();
        const pr = prData.pullRequest || prData;

        const commit = await readBranchRef(repo, "patch");

        const createRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "protected",
                commit,
                filePath: "f.txt",
                line: 1
            },
            ownerToken
        );
        const comment = await createRes.json();

        const thirdUser = await User.create({
            userName: "third",
            email: "third@test.com",
            password: await bcrypt.hash("pass", 10)
        });

        const delRes = await rcDelete(
            repo,
            pr.number,
            comment._id,
            tokenFor(thirdUser._id)
        );
        assert.equal(delRes.status, 403);
    });

    it("deleting root comment also deletes its replies", async () => {
        const repo = await setupReviewRepo();
        const pr = await openPr(repo);
        const commit = await readBranchRef(repo, "feature");

        const rootRes = await rcCreate(
            repo,
            pr.number,
            {
                body: "root",
                commit,
                filePath: "src/app.js",
                line: 1
            },
            ownerToken
        );
        const root = await rootRes.json();

        const replyRes = await rcReply(
            repo,
            pr.number,
            root._id,
            { body: "reply" },
            otherToken
        );
        const reply = await replyRes.json();

        const delRes = await rcDelete(
            repo,
            pr.number,
            root._id,
            ownerToken
        );
        assert.equal(delRes.status, 200);

        const orphanReply = await ReviewComment.findById(
            reply._id
        );
        assert.equal(orphanReply, null);
    });
});

describe("private repository access", () => {
    it("returns 403 for non-owner on private repo", async () => {
        const repo = await createRepo("priv", "private");
        await writeRepoFile(repo, "f.txt", "c");
        await commitHeadCommit(repo, "init");

        const prRes = await prCreateRequest(
            repo,
            {
                sourceBranch: "main",
                targetBranch: "main",
                title: "t"
            },
            ownerToken
        );
        const prData = await prRes.json();
        const pr = prData.pullRequest || prData;

        const commit = await readBranchRef(repo, "main");

        const res = await rcCreate(
            repo,
            pr.number,
            {
                body: "test",
                commit,
                filePath: "f.txt",
                line: 1
            },
            otherToken
        );
        assert.equal(res.status, 403);
    });
});
