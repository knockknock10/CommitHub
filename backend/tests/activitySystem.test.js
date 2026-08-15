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
import Issue from "../models/issueMode.js";
import Comment from "../models/commentModel.js";
import PullRequest from "../models/pullRequestModel.js";
import Tag from "../models/tagModel.js";
import Release from "../models/releaseModel.js";
import Activity from "../models/activityModel.js";
import { createActivity } from "../utils/activityService.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import issueRoutes from "../routes/issueRoutes.js";
import commentRoutes from "../routes/commentRoutes.js";
import activityRoutes from "../routes/activityRoutes.js";
import { getRepoRoot } from "../utils/repoStorage.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-activity-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace(
        "/commithub?",
        "/commithub_activity_test?"
    );

const app = express();

app.use(express.json({ limit: "4mb" }));
app.use("/api/repositories", repositoryRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/activity", activityRoutes);

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

const createUser = async (userName, email) =>
    User.create({
        userName,
        email,
        password: await bcrypt.hash("password123", 10)
    });

let owner;
let other;
let third;
let ownerToken;
let otherToken;
let thirdToken;

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

const commitRequest = (repository, message, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/commits`,
        "POST",
        { message },
        token
    );

const makeCommit = async (repository, message, fileName) => {
    await writeRepoFile(repository, fileName, `${fileName} content`);
    const response = await commitRequest(
        repository,
        message,
        ownerToken
    );
    assert.equal(response.status, 201);
    const body = await response.json();
    return body.id;
};

const branchRequest = (repository, body, token) =>
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

const setupFastForwardRepo = async () => {
    const repo = await createRepo("prrepo");
    await writeRepoFile(repo, "base.txt", "base");
    await makeCommit(repo, "base", "base2.txt");
    await branchRequest(repo, { name: "dev" }, ownerToken);
    await checkoutRequest(repo, { name: "dev" }, ownerToken);
    await writeRepoFile(repo, "feature.txt", "feature");
    await makeCommit(repo, "dev work", "feature2.txt");
    await checkoutRequest(repo, { name: "main" }, ownerToken);
    return repo;
};

const starRequest = (repository, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/star`,
        "PATCH",
        {},
        token
    );

const createIssueRequest = (repository, body, token) =>
    jsonRequest(
        `/api/issues/repository/${repository._id}`,
        "POST",
        body,
        token
    );

const openIssue = async (repository, token = otherToken) => {
    const response = await createIssueRequest(
        repository,
        { title: "Bug", description: "detail" },
        token
    );
    assert.equal(response.status, 201);
    const body = await response.json();
    return body.issue;
};

const commentRequest = (issueId, content, token) =>
    jsonRequest(
        `/api/comments/${issueId}`,
        "POST",
        { content },
        token
    );

const openPullRequest = async (repository, token = otherToken) => {
    const response = await jsonRequest(
        `/api/repositories/${repository._id}/pull-requests`,
        "POST",
        {
            sourceBranch: "dev",
            targetBranch: "main",
            title: "Add feature",
            description: "desc"
        },
        token
    );
    assert.equal(response.status, 201);
    return response.json();
};

const prReviewRequest = (repository, number, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/reviews`,
        "POST",
        body,
        token
    );

const prCommentRequest = (repository, number, content, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/comments`,
        "POST",
        { content },
        token
    );

const prMergeRequest = (repository, number, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/pull-requests/${number}/merge`,
        "POST",
        {},
        token
    );

const tagRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/tags`,
        "POST",
        body,
        token
    );

const releaseRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/releases`,
        "POST",
        body,
        token
    );

const updateReleaseRequest = (repository, releaseId, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/releases/${releaseId}`,
        "PATCH",
        body,
        token
    );

const listActivity = (query, token) =>
    getRequest(
        `/api/activity${query ? `?${query}` : ""}`,
        token
    );

const listRepositoryActivity = (repositoryId, query, token) =>
    getRequest(
        `/api/repositories/${repositoryId}/activity${query ? `?${query}` : ""}`,
        token
    );

const getActivities = async (token) => {
    const response = await listActivity("", token);
    assert.equal(response.status, 200);
    const body = await response.json();
    return body.activities;
};

const getRepositoryActivities = async (repository, token) => {
    const response = await listRepositoryActivity(repository._id, "", token);
    assert.equal(response.status, 200);
    const body = await response.json();
    return body.activities;
};

const getRepositoryActivityBody = async (repository, query, token) => {
    const response = await listRepositoryActivity(repository._id, query, token);
    const body = await response.json();
    return { response, body };
};

const publishRelease = async (repository) => {
    const commitId = await makeCommit(repository, "tagged", "tag.txt");
    const tagResponse = await tagRequest(
        repository,
        { name: "v1.0.0", commitId },
        ownerToken
    );
    assert.equal(tagResponse.status, 201);

    const created = await releaseRequest(
        repository,
        { tagName: "v1.0.0", title: "First release" },
        ownerToken
    );
    assert.equal(created.status, 201);
    const release = await created.json();

    const publish = await updateReleaseRequest(
        repository,
        release._id,
        { status: "published" },
        ownerToken
    );
    assert.equal(publish.status, 200);

    return release;
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
        Repository.deleteMany({}),
        Issue.deleteMany({}),
        Comment.deleteMany({}),
        PullRequest.deleteMany({}),
        Tag.deleteMany({}),
        Release.deleteMany({}),
        Activity.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    await fs.promises.mkdir(storageRoot, { recursive: true });

    owner = await createUser("owneruser", "owner@test.com");
    other = await createUser("otheruser", "other@test.com");
    third = await createUser("thirduser", "third@test.com");
    ownerToken = tokenFor(owner._id);
    otherToken = tokenFor(other._id);
    thirdToken = tokenFor(third._id);
});

after(async () => {
    await Promise.all([
        User.deleteMany({}),
        Repository.deleteMany({}),
        Issue.deleteMany({}),
        Comment.deleteMany({}),
        PullRequest.deleteMany({}),
        Tag.deleteMany({}),
        Release.deleteMany({}),
        Activity.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });

    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("activity creation: repositories", () => {
    it("records REPOSITORY_CREATED when a repository is created", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "newrepo", description: "desc" },
            ownerToken
        );
        assert.equal(response.status, 201);
        const repository = await response.json();

        const activities = await getActivities(ownerToken);

        assert.equal(activities.length, 1);

        const activity = activities[0];
        assert.equal(activity.type, "REPOSITORY_CREATED");
        assert.equal(activity.actor.userName, "owneruser");
        assert.equal(
            activity.repository._id.toString(),
            repository._id.toString()
        );
    });
});

describe("activity creation: branches", () => {
    it("records BRANCH_CREATED when a branch is created", async () => {
        const repo = await createRepo("branches");
        await writeRepoFile(repo, "base.txt", "base");
        await makeCommit(repo, "base", "base2.txt");

        const response = await branchRequest(
            repo,
            { name: "feature/x" },
            ownerToken
        );
        assert.equal(response.status, 201);

        const activities = await getRepositoryActivities(repo, ownerToken);

        const branchActivities = activities.filter(
            (activity) => activity.type === "BRANCH_CREATED"
        );

        assert.equal(branchActivities.length, 1);

        const activity = branchActivities[0];
        assert.equal(activity.actor.userName, "owneruser");
        assert.equal(activity.metadata.branchName, "feature/x");
    });
});

describe("activity creation: commits", () => {
    it("records COMMIT_CREATED when a commit is created", async () => {
        const repo = await createRepo("commits");
        await writeRepoFile(repo, "base.txt", "base");

        const response = await commitRequest(
            repo,
            "initial commit",
            ownerToken
        );
        assert.equal(response.status, 201);

        const activities = await getRepositoryActivities(repo, ownerToken);

        assert.equal(activities.length, 1);

        const activity = activities[0];
        assert.equal(activity.type, "COMMIT_CREATED");
        assert.equal(activity.actor.userName, "owneruser");
        assert.equal(activity.metadata.commitMessage, "initial commit");
        assert.ok(activity.commitId);
    });
});

describe("activity creation: issues", () => {
    it("records ISSUE_CREATED when an issue is created", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const activities = await getRepositoryActivities(repo, otherToken);

        assert.equal(activities.length, 1);

        const activity = activities[0];
        assert.equal(activity.type, "ISSUE_CREATED");
        assert.equal(activity.actor.userName, "otheruser");
        assert.equal(
            activity.issue._id.toString(),
            issue._id.toString()
        );
        assert.equal(activity.metadata.issueTitle, "Bug");
    });

    it("records ISSUE_COMMENTED when an issue comment is added", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const response = await commentRequest(
            issue._id,
            "Let me take a look",
            ownerToken
        );
        assert.equal(response.status, 201);

        const activities = await getRepositoryActivities(repo, ownerToken);

        const commented = activities.find(
            (activity) => activity.type === "ISSUE_COMMENTED"
        );

        assert.ok(commented);
        assert.equal(commented.actor.userName, "owneruser");
        assert.equal(
            commented.issue._id.toString(),
            issue._id.toString()
        );
    });
});

describe("activity creation: pull requests", () => {
    it("records PR_CREATED when a pull request is opened", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const activities = await getRepositoryActivities(repo, otherToken);

        const created = activities.find(
            (activity) => activity.type === "PR_CREATED"
        );

        assert.ok(created);
        assert.equal(created.actor.userName, "otheruser");
        assert.equal(
            created.pullRequest._id.toString(),
            pr._id.toString()
        );
        assert.equal(created.metadata.pullRequestNumber, 1);
    });

    it("records PR_COMMENTED when a pull request comment is added", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const response = await prCommentRequest(
            repo,
            pr.number,
            "Nice work",
            ownerToken
        );
        assert.equal(response.status, 201);

        const activities = await getRepositoryActivities(repo, ownerToken);

        const commented = activities.find(
            (activity) => activity.type === "PR_COMMENTED"
        );

        assert.ok(commented);
        assert.equal(commented.actor.userName, "owneruser");
        assert.equal(commented.metadata.pullRequestNumber, 1);
    });

    it("records PR_REVIEWED when a review is submitted", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const response = await prReviewRequest(
            repo,
            pr.number,
            { state: "approved", comment: "LGTM" },
            ownerToken
        );
        assert.equal(response.status, 201);

        const activities = await getRepositoryActivities(repo, ownerToken);

        const reviewed = activities.find(
            (activity) => activity.type === "PR_REVIEWED"
        );

        assert.ok(reviewed);
        assert.equal(reviewed.actor.userName, "owneruser");
        assert.equal(reviewed.metadata.reviewState, "approved");
        assert.equal(reviewed.metadata.pullRequestNumber, 1);
    });

    it("records PR_MERGED when a pull request is merged", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const response = await prMergeRequest(
            repo,
            pr.number,
            ownerToken
        );
        assert.equal(response.status, 200);

        const activities = await getRepositoryActivities(repo, ownerToken);

        const merged = activities.find(
            (activity) => activity.type === "PR_MERGED"
        );

        assert.ok(merged);
        assert.equal(merged.actor.userName, "owneruser");
        assert.equal(merged.metadata.pullRequestNumber, 1);
        assert.equal(merged.metadata.pullRequestTitle, "Add feature");
    });
});

describe("activity creation: tags and releases", () => {
    it("records TAG_CREATED when a tag is created", async () => {
        const repo = await createRepo("tags");
        const commitId = await makeCommit(repo, "tagged", "tag.txt");

        const response = await tagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );
        assert.equal(response.status, 201);

        const activities = await getRepositoryActivities(repo, ownerToken);

        const created = activities.find(
            (activity) => activity.type === "TAG_CREATED"
        );

        assert.ok(created);
        assert.equal(created.actor.userName, "owneruser");
        assert.equal(created.metadata.tagName, "v1.0.0");
        assert.ok(created.tag);
    });

    it("records RELEASE_PUBLISHED when a release is published", async () => {
        const repo = await createRepo("releases");
        const release = await publishRelease(repo);

        const activities = await getRepositoryActivities(repo, ownerToken);

        const published = activities.find(
            (activity) => activity.type === "RELEASE_PUBLISHED"
        );

        assert.ok(published);
        assert.equal(published.actor.userName, "owneruser");
        assert.equal(
            published.release._id.toString(),
            release._id.toString()
        );
        assert.equal(published.metadata.tagName, "v1.0.0");
        assert.equal(published.metadata.releaseTitle, "First release");
    });

    it("records RELEASE_PUBLISHED only once on repeated publish", async () => {
        const repo = await createRepo("releases");
        const release = await publishRelease(repo);

        const repeat = await updateReleaseRequest(
            repo,
            release._id,
            { status: "published" },
            ownerToken
        );
        assert.equal(repeat.status, 200);

        const activities = await getRepositoryActivities(repo, ownerToken);

        assert.equal(
            activities.filter(
                (activity) => activity.type === "RELEASE_PUBLISHED"
            ).length,
            1
        );
    });
});

describe("activity creation: repository stars", () => {
    it("records REPOSITORY_STARRED when a repository is starred", async () => {
        const repo = await createRepo("stars");

        const response = await starRequest(repo, otherToken);
        assert.equal(response.status, 200);

        const activities = await getRepositoryActivities(repo, otherToken);

        assert.equal(activities.length, 1);

        const activity = activities[0];
        assert.equal(activity.type, "REPOSITORY_STARRED");
        assert.equal(activity.actor.userName, "otheruser");
    });

    it("does not record a duplicate star activity on repeated stars", async () => {
        const repo = await createRepo("stars");

        await starRequest(repo, otherToken);
        await starRequest(repo, otherToken);

        const activities = await getRepositoryActivities(repo, otherToken);

        assert.equal(
            activities.filter(
                (activity) => activity.type === "REPOSITORY_STARRED"
            ).length,
            1
        );
    });
});

describe("activity actor integrity", () => {
    it("derives the actor from the authenticated user, ignoring client input", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            {
                name: "spoof-repo",
                description: "desc",
                actor: third._id.toString()
            },
            ownerToken
        );
        assert.equal(response.status, 201);

        const activities = await getRepositoryActivities(
            { _id: (await response.json())._id },
            ownerToken
        );

        assert.equal(activities.length, 1);
        assert.equal(
            activities[0].actor._id.toString(),
            owner._id.toString()
        );
    });

    it("createActivity rejects a missing actor", async () => {
        const repo = await createRepo("service");

        const activity = await createActivity({
            type: "ISSUE_CREATED",
            repository: repo._id
        });

        assert.equal(activity, null);
        assert.equal(await Activity.countDocuments({}), 0);
    });

    it("createActivity rejects an unknown activity type", async () => {
        const repo = await createRepo("service");

        const activity = await createActivity({
            actor: owner._id,
            type: "NOT_A_REAL_EVENT",
            repository: repo._id
        });

        assert.equal(activity, null);
        assert.equal(await Activity.countDocuments({}), 0);
    });

    it("createActivity rejects a missing repository", async () => {
        const activity = await createActivity({
            actor: owner._id,
            type: "ISSUE_CREATED"
        });

        assert.equal(activity, null);
        assert.equal(await Activity.countDocuments({}), 0);
    });
});

describe("repository activity endpoint", () => {
    it("requires authentication", async () => {
        const repo = await createRepo("authz");
        const response = await listRepositoryActivity(repo._id, "", null);
        assert.equal(response.status, 401);
    });

    it("returns an empty feed for a repository with no activity", async () => {
        const repo = await createRepo("empty");

        const { response, body } = await getRepositoryActivityBody(
            repo,
            "",
            ownerToken
        );

        assert.equal(response.status, 200);
        assert.equal(body.activities.length, 0);
        assert.equal(body.total, 0);
    });

    it("rejects an invalid repository id", async () => {
        const response = await listRepositoryActivity(
            "not-an-id",
            "",
            ownerToken
        );
        assert.equal(response.status, 400);
    });

    it("returns 404 for a nonexistent repository", async () => {
        const response = await listRepositoryActivity(
            new mongoose.Types.ObjectId(),
            "",
            ownerToken
        );
        assert.equal(response.status, 404);
    });

    it("blocks unauthorized access to private repository activity", async () => {
        const repo = await createRepo("private-repo", "private");
        await writeRepoFile(repo, "base.txt", "base");
        await makeCommit(repo, "private commit", "base2.txt");

        const ownerActivities = await getRepositoryActivities(
            repo,
            ownerToken
        );
        assert.equal(ownerActivities.length, 1);

        const response = await listRepositoryActivity(
            repo._id,
            "",
            otherToken
        );
        assert.equal(response.status, 403);
    });

    it("keeps the owner's private repository activity out of other users' feeds", async () => {
        const repo = await createRepo("private-repo", "private");
        await writeRepoFile(repo, "base.txt", "base");
        await makeCommit(repo, "private commit", "base2.txt");

        const otherActivities = await getActivities(otherToken);
        assert.equal(otherActivities.length, 0);

        const thirdActivities = await getActivities(thirdToken);
        assert.equal(thirdActivities.length, 0);
    });
});

describe("user activity feed", () => {
    it("includes activity from the user's own repositories", async () => {
        const repo = await createRepo("owned");
        await writeRepoFile(repo, "base.txt", "base");
        await makeCommit(repo, "mine", "base2.txt");

        const activities = await getActivities(ownerToken);

        assert.equal(activities.length, 1);
        assert.equal(activities[0].type, "COMMIT_CREATED");
        assert.equal(
            activities[0].repository._id.toString(),
            repo._id.toString()
        );
    });

    it("includes activity from public repositories for any authenticated user", async () => {
        const repo = await createRepo("public-repo");
        await writeRepoFile(repo, "base.txt", "base");
        await makeCommit(repo, "public commit", "base2.txt");

        const activities = await getActivities(otherToken);

        assert.equal(activities.length, 1);
        assert.equal(
            activities[0].repository._id.toString(),
            repo._id.toString()
        );
    });

    it("does not leak a repository that became private after being starred", async () => {
        const repo = await createRepo("leaky");
        await starRequest(repo, otherToken);

        const updateResponse = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { visibility: "private" },
            ownerToken
        );
        assert.equal(updateResponse.status, 200);

        await writeRepoFile(repo, "secret.txt", "secret");
        await makeCommit(repo, "secret work", "secret2.txt");

        const otherActivities = await getActivities(otherToken);
        assert.equal(otherActivities.length, 0);
    });

    it("requires authentication", async () => {
        const response = await listActivity("", null);
        assert.equal(response.status, 401);
    });
});

describe("activity ordering and pagination", () => {
    it("returns activity newest first", async () => {
        const repo = await createRepo("ordering");
        await writeRepoFile(repo, "base.txt", "base");
        await makeCommit(repo, "first", "base2.txt");
        await makeCommit(repo, "second", "base3.txt");

        const activities = await getRepositoryActivities(repo, ownerToken);

        assert.equal(activities.length, 2);
        assert.equal(
            activities[0].metadata.commitMessage,
            "second"
        );
        assert.equal(
            activities[1].metadata.commitMessage,
            "first"
        );
    });

    it("paginates activity lists", async () => {
        const repo = await createRepo("pagination");

        for (let index = 0; index < 5; index += 1) {
            await writeRepoFile(repo, `file${index}.txt`, "content");
            await commitRequest(
                repo,
                `commit ${index}`,
                ownerToken
            );
        }

        const firstResponse = await listRepositoryActivity(
            repo._id,
            "page=1&limit=2",
            ownerToken
        );
        const first = await firstResponse.json();

        assert.equal(first.activities.length, 2);
        assert.equal(first.total, 5);
        assert.equal(first.pages, 3);

        const secondResponse = await listRepositoryActivity(
            repo._id,
            "page=2&limit=2",
            ownerToken
        );
        const second = await secondResponse.json();

        assert.equal(second.activities.length, 2);

        const thirdResponse = await listRepositoryActivity(
            repo._id,
            "page=3&limit=2",
            ownerToken
        );
        const third = await thirdResponse.json();

        assert.equal(third.activities.length, 1);

        const seen = new Set(
            [
                ...first.activities,
                ...second.activities,
                ...third.activities
            ].map((activity) => activity._id.toString())
        );
        assert.equal(seen.size, 5);
    });

    it("clamps the limit to a reasonable maximum", async () => {
        const repo = await createRepo("clamp");

        const { response, body } = await getRepositoryActivityBody(
            repo,
            "page=1&limit=5000",
            ownerToken
        );

        assert.equal(response.status, 200);
        assert.ok(body.limit <= 100);
    });

    it("filters activity by type", async () => {
        const repo = await createRepo("filtering");
        await writeRepoFile(repo, "base.txt", "base");
        await makeCommit(repo, "a commit", "base2.txt");
        await branchRequest(repo, { name: "feature/y" }, ownerToken);

        const branchResponse = await listRepositoryActivity(
            repo._id,
            "type=BRANCH_CREATED",
            ownerToken
        );
        const branchBody = await branchResponse.json();

        assert.equal(branchBody.activities.length, 1);
        assert.equal(
            branchBody.activities[0].type,
            "BRANCH_CREATED"
        );

        const commitResponse = await listRepositoryActivity(
            repo._id,
            "type=COMMIT_CREATED",
            ownerToken
        );
        const commitBody = await commitResponse.json();

        assert.equal(commitBody.activities.length, 1);
        assert.equal(
            commitBody.activities[0].type,
            "COMMIT_CREATED"
        );
    });

    it("rejects an invalid activity type filter", async () => {
        const repo = await createRepo("filtering");

        const response = await listRepositoryActivity(
            repo._id,
            "type=BOGUS",
            ownerToken
        );
        assert.equal(response.status, 400);
    });

    it("filters activity by a comma-separated group of types", async () => {
        const repo = await createRepo("group-filter");
        await writeRepoFile(repo, "base.txt", "base");
        await makeCommit(repo, "a commit", "base2.txt");
        await branchRequest(repo, { name: "feature/z" }, ownerToken);

        const response = await listRepositoryActivity(
            repo._id,
            "type=COMMIT_CREATED,BRANCH_CREATED",
            ownerToken
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.activities.length, 2);

        const types = new Set(
            body.activities.map((activity) => activity.type)
        );
        assert.deepEqual(
            Array.from(types).sort(),
            ["BRANCH_CREATED", "COMMIT_CREATED"]
        );
    });
});

describe("deleted referenced entities", () => {
    it("still returns the activity when the referenced issue is deleted", async () => {
        const repo = await createRepo("deleted-ref");
        const issue = await openIssue(repo, otherToken);

        await Issue.deleteOne({ _id: issue._id });

        const activities = await getRepositoryActivities(repo, otherToken);

        assert.equal(activities.length, 1);
        assert.equal(activities[0].type, "ISSUE_CREATED");
        assert.equal(activities[0].issue, null);
    });

    it("still returns the activity when the referenced pull request is deleted", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        await PullRequest.deleteOne({ _id: pr._id });

        const activities = await getRepositoryActivities(repo, otherToken);

        const created = activities.find(
            (activity) => activity.type === "PR_CREATED"
        );

        assert.ok(created);
        assert.equal(created.pullRequest, null);
        assert.equal(created.metadata.pullRequestNumber, 1);
    });
});
