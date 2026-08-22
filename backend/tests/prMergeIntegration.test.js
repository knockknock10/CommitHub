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

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-pr-merge-int-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace(
        "/commithub?",
        "/commithub_pr_merge_int_test?"
    );

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

const commitHeadCommit = async (repository, message = "commit") =>
    createCommitRequest(repository, { message }, ownerToken);

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

const prMergeRequest = (repository, number, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/merge`,
        "POST",
        {},
        token
    );

const prMergeStatusRequest = (repository, number, token) =>
    getRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/merge-status`,
        token
    );

const prCloseRequest = (repository, number, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/close`,
        "POST",
        {},
        token
    );

const openPullRequest = async (repo, source = "dev", target = "main") => {
    const res = await prCreateRequest(
        repo,
        {
            sourceBranch: source,
            targetBranch: target,
            title: `Merge ${source} into ${target}`
        },
        ownerToken
    );
    return res.json();
};

const setupFastForwardRepo = async () => {
    const repo = await createRepo("prmergeff");
    await writeRepoFile(repo, "feature.txt", "feature");
    await commitHeadCommit(repo, "add feature");
    await createBranchRequest(repo, { name: "dev" }, ownerToken);
    await checkoutRequest(repo, { name: "dev" }, ownerToken);
    await writeRepoFile(repo, "dev.txt", "dev work");
    await commitHeadCommit(repo, "dev commit");
    await checkoutRequest(repo, { name: "main" }, ownerToken);
    return repo;
};

before(async () => {
    await mongoose.connect(mongoUri);
    await User.deleteMany({});
    await Repository.deleteMany({});
    await PullRequest.deleteMany({});
    await Activity.deleteMany({});
    await Notification.deleteMany({});
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;

    owner = await User.create({
        userName: "mergetestowner",
        email: "mergeowner@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    ownerToken = tokenFor(owner._id);

    other = await User.create({
        userName: "mergetestother",
        email: "mergeother@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    otherToken = tokenFor(other._id);
});

after(async () => {
    await User.deleteMany({});
    await Repository.deleteMany({});
    await PullRequest.deleteMany({});
    await Activity.deleteMany({});
    await Notification.deleteMany({});
    await mongoose.disconnect();
    server.close();
    await fs.promises.rm(storageRoot, {
        recursive: true,
        force: true
    });
});

beforeEach(async () => {
    await User.deleteMany({});
    await Repository.deleteMany({});
    await PullRequest.deleteMany({});
    await Activity.deleteMany({});
    await Notification.deleteMany({});

    owner = await User.create({
        userName: "mergetestowner",
        email: "mergeowner@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    ownerToken = tokenFor(owner._id);

    other = await User.create({
        userName: "mergetestother",
        email: "mergeother@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    otherToken = tokenFor(other._id);
});

describe("PR merge status", () => {
    it("returns READY when branches can be fast-forwarded", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const status = await prMergeStatusRequest(
            repo, pr.number, ownerToken
        );
        const body = await status.json();

        assert.equal(status.status, 200);
        assert.equal(body.status, "READY");
        assert.equal(body.mergeable, true);
        assert.equal(body.fastForward, true);
        assert.equal(body.hasConflicts, false);
        assert.equal(body.sourceBranch, "dev");
        assert.equal(body.targetBranch, "main");
    });

    it("returns CONFLICTS when branches have conflicting changes", async () => {
        const repo = await createRepo("conflictstatus");
        await writeRepoFile(repo, "a.txt", "line1\nline2\n");
        await commitHeadCommit(repo, "base");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "a.txt", "line1\nfeature\n");
        await commitHeadCommit(repo, "dev change");
        await checkoutRequest(repo, { name: "main" }, ownerToken);
        await writeRepoFile(repo, "a.txt", "line1\nmain\n");
        await commitHeadCommit(repo, "main change");

        const pr = await openPullRequest(repo);
        const status = await prMergeStatusRequest(
            repo, pr.number, ownerToken
        );
        const body = await status.json();

        assert.equal(status.status, 200);
        assert.equal(body.status, "CONFLICTS");
        assert.equal(body.hasConflicts, true);
        assert.ok(body.conflicts.length > 0);
    });

    it("returns ALREADY_MERGED when PR is already merged", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        const status = await prMergeStatusRequest(
            repo, pr.number, ownerToken
        );
        const body = await status.json();

        assert.equal(status.status, 200);
        assert.equal(body.status, "ALREADY_MERGED");
        assert.equal(body.mergeable, false);
        assert.ok(body.mergeCommitId);
    });

    it("returns CLOSED when PR is closed", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prCloseRequest(repo, pr.number, ownerToken);

        const status = await prMergeStatusRequest(
            repo, pr.number, ownerToken
        );
        const body = await status.json();

        assert.equal(status.status, 200);
        assert.equal(body.status, "CLOSED");
        assert.equal(body.mergeable, false);
    });

    it("returns ALREADY_UP_TO_DATE when source is behind target", async () => {
        const repo = await createRepo("behindstatus");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo, "base");
        await writeRepoFile(repo, "b.txt", "two");
        await commitHeadCommit(repo, "main second");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "c.txt", "three");
        await commitHeadCommit(repo, "main third");

        const pr = await openPullRequest(repo);
        const status = await prMergeStatusRequest(
            repo, pr.number, ownerToken
        );
        const body = await status.json();

        assert.equal(status.status, 200);
        assert.equal(body.status, "ALREADY_UP_TO_DATE");
        assert.equal(body.mergeable, true);
    });

    it("returns 401 without authentication", async () => {
        const repo = await createRepo("merge-status-private", "private");
        await writeRepoFile(repo, "a.txt", "content");
        await commitHeadCommit(repo, "init");
        const pr = await openPullRequest(repo);
        const status = await prMergeStatusRequest(
            repo, pr.number, otherToken
        );
        assert.equal(status.status, 403);
    });

    it("returns 404 for nonexistent PR", async () => {
        const repo = await setupFastForwardRepo();
        const status = await getRequest(
            `/api/repositories/${repo._id}/pull-requests/999/merge-status`,
            ownerToken
        );
        assert.equal(status.status, 404);
    });
});

describe("PR comparison via detail endpoint", () => {
    it("includes sourceCommitId and targetCommitId", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const detail = await prDetailRequest(repo, pr.number, ownerToken);
        const body = await detail.json();

        assert.ok(body.sourceCommitId);
        assert.ok(body.targetCommitId);
        assert.notEqual(body.sourceCommitId, body.targetCommitId);
    });

    it("includes commits and diff arrays", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const detail = await prDetailRequest(repo, pr.number, ownerToken);
        const body = await detail.json();

        assert.ok(Array.isArray(body.commits));
        assert.ok(body.commits.length > 0);
        assert.ok(body.diff);
    });

    it("reports sourceBranchExists false when source deleted", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await fs.promises.rm(branchRefPath(repo, "dev"));
        const detail = await prDetailRequest(repo, pr.number, ownerToken);
        const body = await detail.json();

        assert.equal(body.sourceBranchExists, false);
        assert.equal(body.sourceCommitId, null);
    });
});

describe("PR merge execution with performMerge", () => {
    it("fast-forwards target branch via performMerge", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const detail = await prDetailRequest(repo, pr.number, ownerToken);
        const detailBody = await detail.json();

        const response = await prMergeRequest(repo, pr.number, ownerToken);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.merged, true);
        assert.equal(body.fastForward, true);
        assert.equal(
            await readBranchRef(repo, "main"),
            detailBody.sourceCommitId
        );
    });

    it("creates a merge commit for diverged branches", async () => {
        const repo = await setupFastForwardRepo();
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "dev2.txt", "dev2");
        await commitHeadCommit(repo, "more dev");
        await checkoutRequest(repo, { name: "main" }, ownerToken);
        await writeRepoFile(repo, "main2.txt", "main2");
        await commitHeadCommit(repo, "main work");

        const pr = await openPullRequest(repo);
        const mainBefore = await readBranchRef(repo, "main");

        const response = await prMergeRequest(repo, pr.number, ownerToken);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.merged, true);
        assert.equal(body.fastForward, false);
        assert.ok(body.mergeCommitId);
        assert.notEqual(body.mergeCommitId, mainBefore);

        const mainAfter = await readBranchRef(repo, "main");
        assert.equal(mainAfter, body.mergeCommitId);
    });

    it("merge commit snapshot contains files from both branches", async () => {
        const repo = await setupFastForwardRepo();
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "dev2.txt", "dev2");
        await commitHeadCommit(repo, "more dev");
        await checkoutRequest(repo, { name: "main" }, ownerToken);
        await writeRepoFile(repo, "main2.txt", "main2");
        await commitHeadCommit(repo, "main work");

        const pr = await openPullRequest(repo);
        const response = await prMergeRequest(repo, pr.number, ownerToken);
        const body = await response.json();

        assert.equal(response.status, 200);

        const { ensureVersionControl, getSnapshot } = await import(
            "../utils/repoVersion.js"
        );
        const vcRoot = await ensureVersionControl(repoRoot(repo));
        const snapshot = await getSnapshot(vcRoot, body.mergeCommitId);
        const files = new Set(snapshot.files);
        assert.ok(files.has("dev2.txt"));
        assert.ok(files.has("main2.txt"));
        assert.ok(files.has("feature.txt"));
    });

    it("source branch remains unchanged after merge", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const devBefore = await readBranchRef(repo, "dev");

        await prMergeRequest(repo, pr.number, ownerToken);

        const devAfter = await readBranchRef(repo, "dev");
        assert.equal(devAfter, devBefore);
    });
});

describe("PR state after merge", () => {
    it("sets PR status to merged", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number: pr.number
        });
        assert.equal(stored.status, "merged");
    });

    it("stores mergedBy as authenticated user", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number: pr.number
        });
        assert.equal(stored.mergedBy.toString(), owner._id.toString());
    });

    it("stores mergedAt as a Date", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number: pr.number
        });
        assert.ok(stored.mergedAt instanceof Date);
    });

    it("stores mergeCommitId", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const response = await prMergeRequest(repo, pr.number, ownerToken);
        const body = await response.json();

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number: pr.number
        });
        assert.equal(stored.mergeCommitId, body.mergeCommitId);
    });

    it("stores mergeSourceCommitId", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const detail = await prDetailRequest(repo, pr.number, ownerToken);
        const detailBody = await detail.json();

        await prMergeRequest(repo, pr.number, ownerToken);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number: pr.number
        });
        assert.equal(
            stored.mergeSourceCommitId,
            detailBody.sourceCommitId
        );
    });

    it("returns mergedBy in response", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const response = await prMergeRequest(repo, pr.number, ownerToken);
        const body = await response.json();

        assert.ok(body.mergedBy);
        assert.equal(body.mergedBy, owner._id.toString());
    });

    it("returns mergedAt in response", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const response = await prMergeRequest(repo, pr.number, ownerToken);
        const body = await response.json();

        assert.ok(body.mergedAt);
    });
});

describe("merge conflict rejection", () => {
    it("rejects PR merge when branches have conflicts", async () => {
        const repo = await createRepo("conflictmerge");
        await writeRepoFile(repo, "a.txt", "line1\nline2\n");
        await commitHeadCommit(repo, "base");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "a.txt", "line1\nfeature\n");
        await commitHeadCommit(repo, "dev change");
        await checkoutRequest(repo, { name: "main" }, ownerToken);
        await writeRepoFile(repo, "a.txt", "line1\nmain\n");
        await commitHeadCommit(repo, "main change");

        const pr = await openPullRequest(repo);
        const response = await prMergeRequest(repo, pr.number, ownerToken);

        assert.equal(response.status, 409);
        const body = await response.json();
        assert.equal(body.status, "CONFLICTS");
        assert.ok(body.conflicts.length > 0);
    });

    it("does not modify branches when merge is rejected", async () => {
        const repo = await createRepo("conflict-safe");
        await writeRepoFile(repo, "a.txt", "shared\n");
        await commitHeadCommit(repo, "base");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "a.txt", "feature\n");
        await commitHeadCommit(repo, "dev change");
        await checkoutRequest(repo, { name: "main" }, ownerToken);
        await writeRepoFile(repo, "a.txt", "main\n");
        await commitHeadCommit(repo, "main change");

        const mainBefore = await readBranchRef(repo, "main");
        const devBefore = await readBranchRef(repo, "dev");

        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        assert.equal(await readBranchRef(repo, "main"), mainBefore);
        assert.equal(await readBranchRef(repo, "dev"), devBefore);
    });

    it("PR remains open when merge is rejected due to conflicts", async () => {
        const repo = await createRepo("conflict-still-open");
        await writeRepoFile(repo, "a.txt", "shared\n");
        await commitHeadCommit(repo, "base");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "a.txt", "feature\n");
        await commitHeadCommit(repo, "dev change");
        await checkoutRequest(repo, { name: "main" }, ownerToken);
        await writeRepoFile(repo, "a.txt", "main\n");
        await commitHeadCommit(repo, "main change");

        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        const stored = await PullRequest.findOne({
            repository: repo._id,
            number: pr.number
        });
        assert.equal(stored.status, "open");
    });
});

describe("PR state transition guards", () => {
    it("rejects merging a closed PR", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prCloseRequest(repo, pr.number, ownerToken);

        const response = await prMergeRequest(repo, pr.number, ownerToken);
        assert.equal(response.status, 400);
    });

    it("rejects merging an already merged PR", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        const response = await prMergeRequest(repo, pr.number, ownerToken);
        assert.equal(response.status, 409);
    });

    it("prevents duplicate merge via atomic status update", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);

        const [res1, res2] = await Promise.all([
            prMergeRequest(repo, pr.number, ownerToken),
            prMergeRequest(repo, pr.number, ownerToken)
        ]);

        const statuses = [res1.status, res2.status].sort();
        assert.deepEqual(statuses, [200, 409]);
    });
});

describe("missing branches", () => {
    it("returns 400 when source branch is deleted", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await fs.promises.rm(branchRefPath(repo, "dev"));

        const response = await prMergeRequest(repo, pr.number, ownerToken);
        assert.equal(response.status, 400);
        const body = await response.json();
        assert.ok(body.message.includes("dev"));
    });

    it("returns 400 when target branch is deleted", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await fs.promises.rm(branchRefPath(repo, "main"));

        const response = await prMergeRequest(repo, pr.number, ownerToken);
        assert.equal(response.status, 400);
        const body = await response.json();
        assert.ok(body.message.includes("main"));
    });
});

describe("target branch changes before merge", () => {
    it("merges correctly when target has advanced", async () => {
        const repo = await createRepo("target-advanced");
        await writeRepoFile(repo, "base.txt", "base");
        await commitHeadCommit(repo, "base");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "dev.txt", "dev");
        await commitHeadCommit(repo, "dev work");
        await checkoutRequest(repo, { name: "main" }, ownerToken);
        await writeRepoFile(repo, "main.txt", "main");
        await commitHeadCommit(repo, "main work");

        const pr = await openPullRequest(repo);
        const mainBefore = await readBranchRef(repo, "main");

        const response = await prMergeRequest(repo, pr.number, ownerToken);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.fastForward, false);
        assert.ok(body.mergeCommitId);
        assert.notEqual(body.mergeCommitId, mainBefore);

        const mainAfter = await readBranchRef(repo, "main");
        assert.equal(mainAfter, body.mergeCommitId);
    });
});

describe("activity and notification on merge", () => {
    it("creates PR_MERGED activity", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        const activity = await Activity.findOne({
            repository: repo._id,
            type: "PR_MERGED"
        });
        assert.ok(activity);
        assert.equal(activity.actor.toString(), owner._id.toString());
        assert.equal(
            activity.metadata.pullRequestNumber,
            pr.number
        );
        assert.equal(
            activity.metadata.sourceBranch,
            "dev"
        );
        assert.equal(
            activity.metadata.targetBranch,
            "main"
        );
    });

    it("creates PR_MERGED notification for PR author", async () => {
        const repo = await createRepo("notif-author");
        await writeRepoFile(repo, "a.txt", "content");
        await commitHeadCommit(repo, "init");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "b.txt", "new");
        await commitHeadCommit(repo, "dev work");
        await checkoutRequest(repo, { name: "main" }, ownerToken);

        await prCreateRequest(
            repo,
            {
                sourceBranch: "dev",
                targetBranch: "main",
                title: "PR from other"
            },
            otherToken
        );

        const prs = await PullRequest.find({ repository: repo._id });
        const pr = prs[0];

        await prMergeRequest(repo, pr.number, ownerToken);

        const notification = await Notification.findOne({
            repository: repo._id,
            type: "PR_MERGED"
        });
        assert.ok(notification);
        assert.equal(
            notification.recipient.toString(),
            other._id.toString()
        );
    });

    it("does not self-notify when owner merges their own PR", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        await prMergeRequest(repo, pr.number, ownerToken);

        const notifications = await Notification.find({
            repository: repo._id,
            type: "PR_MERGED"
        });
        assert.equal(notifications.length, 0);
    });

    it("notifies PR author when different user merges", async () => {
        const repo = await createRepo("other-merge-notify");
        await writeRepoFile(repo, "base.txt", "base");
        await commitHeadCommit(repo, "base");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "dev.txt", "dev");
        await commitHeadCommit(repo, "dev work");
        await checkoutRequest(repo, { name: "main" }, ownerToken);

        await prCreateRequest(
            repo,
            {
                sourceBranch: "dev",
                targetBranch: "main",
                title: "PR from other"
            },
            otherToken
        );

        const prs = await PullRequest.find({
            repository: repo._id
        });
        const pr = prs[0];

        await prMergeRequest(repo, pr.number, ownerToken);

        const notification = await Notification.findOne({
            repository: repo._id,
            type: "PR_MERGED"
        });
        assert.ok(notification);
        assert.equal(
            notification.recipient.toString(),
            other._id.toString()
        );
        assert.equal(
            notification.actor.toString(),
            owner._id.toString()
        );
    });
});

describe("authorization", () => {
    it("returns 401 without token", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const response = await request(
            `/api/repositories/${repo._id}/pull-requests/${pr.number}/merge`,
            { method: "POST", headers: { "Content-Type": "application/json" } }
        );
        assert.equal(response.status, 401);
    });

    it("returns 403 for non-owner on private repo", async () => {
        const repo = await createRepo("priv-merge", "private");
        await writeRepoFile(repo, "a.txt", "content");
        await commitHeadCommit(repo, "init");
        await createBranchRequest(repo, { name: "dev" }, ownerToken);
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "b.txt", "new");
        await commitHeadCommit(repo, "dev work");
        await checkoutRequest(repo, { name: "main" }, ownerToken);

        const pr = await openPullRequest(repo);
        const response = await prMergeRequest(repo, pr.number, otherToken);
        assert.equal(response.status, 403);
    });

    it("returns 404 for nonexistent PR", async () => {
        const repo = await setupFastForwardRepo();
        const response = await prMergeRequest(repo, 999, ownerToken);
        assert.equal(response.status, 404);
    });

    it("returns 400 for invalid PR number", async () => {
        const repo = await setupFastForwardRepo();
        const response = await request(
            `/api/repositories/${repo._id}/pull-requests/abc/merge`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${ownerToken}`
                }
            }
        );
        assert.equal(response.status, 400);
    });
});

describe("immutability of old commits", () => {
    it("old commit snapshots remain unchanged after merge commit", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo);
        const detail = await prDetailRequest(repo, pr.number, ownerToken);
        const detailBody = await detail.json();
        const sourceCommitId = detailBody.sourceCommitId;

        await prMergeRequest(repo, pr.number, ownerToken);

        const { ensureVersionControl, getSnapshot } = await import(
            "../utils/repoVersion.js"
        );
        const vcRoot = await ensureVersionControl(repoRoot(repo));
        const snapshot = await getSnapshot(vcRoot, sourceCommitId);
        assert.ok(snapshot);
        assert.ok(snapshot.files.length > 0);
    });
});
