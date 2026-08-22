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
import Notification from "../models/notificationModel.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import issueRoutes from "../routes/issueRoutes.js";
import commentRoutes from "../routes/commentRoutes.js";
import notificationRoutes from "../routes/notificationRoutes.js";
import { getRepoRoot } from "../utils/repoStorage.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-notification-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace(
        "/commithub?",
        "/commithub_notification_test?"
    );

const app = express();

app.use(express.json({ limit: "4mb" }));
app.use("/api/repositories", repositoryRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);

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

const unstarRequest = (repository, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/unstar`,
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

const listNotifications = (query, token) =>
    getRequest(
        `/api/notifications${query ? `?${query}` : ""}`,
        token
    );

const unreadCountRequest = (token) =>
    getRequest("/api/notifications/unread-count", token);

const markReadRequest = (id, token) =>
    jsonRequest(`/api/notifications/${id}/read`, "PATCH", {}, token);

const markAllReadRequest = (token) =>
    jsonRequest(
        "/api/notifications/read-all",
        "PATCH",
        {},
        token
    );

const deleteNotificationRequest = (id, token) =>
    request(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

const getOwnerNotifications = async () => {
    const response = await listNotifications("", ownerToken);
    assert.equal(response.status, 200);
    const body = await response.json();
    return body.notifications;
};

const getOtherNotifications = async () => {
    const response = await listNotifications("", otherToken);
    assert.equal(response.status, 200);
    const body = await response.json();
    return body.notifications;
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
        Notification.deleteMany({})
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
        Notification.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });

    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("notification creation: issues", () => {
    it("notifies the repository owner when a non-owner creates an issue", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const notifications = await getOwnerNotifications();

        assert.equal(notifications.length, 1);

        const notification = notifications[0];
        assert.equal(notification.type, "ISSUE_CREATED");
        assert.equal(
            notification.recipient.toString(),
            owner._id.toString()
        );
        assert.equal(
            notification.actor.userName,
            "otheruser"
        );
        assert.equal(
            notification.repository.toString(),
            repo._id.toString()
        );
        assert.equal(
            notification.issue._id.toString(),
            issue._id.toString()
        );
        assert.equal(notification.read, false);
        assert.match(notification.message, /Bug/);
    });

    it("does not notify when the owner creates their own issue", async () => {
        const repo = await createRepo("issues");
        await openIssue(repo, ownerToken);

        const notifications = await getOwnerNotifications();
        assert.equal(notifications.length, 0);
    });

    it("blocks non-owners from creating issues in private repositories", async () => {
        const repo = await createRepo("private-repo", "private");

        const response = await createIssueRequest(
            repo,
            { title: "Sneaky", description: "nope" },
            otherToken
        );

        assert.equal(response.status, 403);

        const notifications = await getOwnerNotifications();
        assert.equal(notifications.length, 0);
    });
});

describe("notification creation: issue comments", () => {
    it("notifies the issue author when someone comments on their issue", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const response = await commentRequest(
            issue._id,
            "Let me take a look",
            ownerToken
        );
        assert.equal(response.status, 201);

        const notifications = await getOtherNotifications();

        assert.equal(notifications.length, 1);

        const notification = notifications[0];
        assert.equal(notification.type, "ISSUE_COMMENTED");
        assert.equal(
            notification.recipient.toString(),
            other._id.toString()
        );
        assert.equal(
            notification.actor.userName,
            "owneruser"
        );
        assert.ok(notification.comment);
        assert.match(notification.message, /Bug/);
    });

    it("does not notify the author when they comment on their own issue", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const response = await commentRequest(
            issue._id,
            "bumping myself",
            otherToken
        );
        assert.equal(response.status, 201);

        const notifications = await getOtherNotifications();
        assert.equal(notifications.length, 0);
    });
});

describe("notification creation: pull requests", () => {
    it("notifies the repository owner when a non-owner opens a pull request", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const notifications = await getOwnerNotifications();

        assert.equal(notifications.length, 1);

        const notification = notifications[0];
        assert.equal(notification.type, "PR_CREATED");
        assert.equal(
            notification.pullRequest._id.toString(),
            pr._id.toString()
        );
        assert.equal(notification.pullRequest.number, 1);
        assert.match(notification.pullRequest.title, /Add feature/);
    });

    it("does not notify the owner when they open their own pull request", async () => {
        const repo = await setupFastForwardRepo();
        await openPullRequest(repo, ownerToken);

        const notifications = await getOwnerNotifications();
        assert.equal(notifications.length, 0);
    });

    it("notifies the pull request author when the repository owner comments", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const response = await prCommentRequest(
            repo,
            pr.number,
            "Nice work",
            ownerToken
        );
        assert.equal(response.status, 201);

        const notifications = await getOtherNotifications();

        assert.equal(notifications.length, 1);

        const notification = notifications[0];
        assert.equal(notification.type, "PR_COMMENTED");
        assert.equal(
            notification.pullRequest._id.toString(),
            pr._id.toString()
        );
        assert.match(notification.message, /Add feature/);
    });

    it("notifies the pull request author when the repository owner reviews", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const response = await prReviewRequest(
            repo,
            pr.number,
            { state: "approved", comment: "LGTM" },
            ownerToken
        );
        assert.equal(response.status, 201);

        const notifications = await getOtherNotifications();

        assert.equal(notifications.length, 1);

        const notification = notifications[0];
        assert.equal(notification.type, "PR_APPROVED");
        assert.equal(
            notification.actor.userName,
            "owneruser"
        );
        assert.match(notification.message, /Add feature/);
    });

    it("notifies the pull request author when the pull request is merged", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const response = await prMergeRequest(
            repo,
            pr.number,
            ownerToken
        );
        assert.equal(response.status, 200);

        const notifications = await getOtherNotifications();

        assert.equal(notifications.length, 1);

        const notification = notifications[0];
        assert.equal(notification.type, "PR_MERGED");
        assert.equal(
            notification.actor.userName,
            "owneruser"
        );
        assert.match(notification.message, /Add feature/);
    });
});

describe("notification creation: repository stars", () => {
    it("notifies the repository owner when a non-owner stars the repository", async () => {
        const repo = await createRepo("stars");

        const response = await starRequest(repo, otherToken);
        assert.equal(response.status, 200);

        const notifications = await getOwnerNotifications();

        assert.equal(notifications.length, 1);

        const notification = notifications[0];
        assert.equal(notification.type, "REPOSITORY_STARRED");
        assert.equal(
            notification.actor.userName,
            "otheruser"
        );
        assert.match(notification.message, /starred/);
    });

    it("does not notify the owner when they star their own repository", async () => {
        const repo = await createRepo("stars");

        const response = await starRequest(repo, ownerToken);
        assert.equal(response.status, 200);

        const notifications = await getOwnerNotifications();
        assert.equal(notifications.length, 0);
    });

    it("does not duplicate the star notification on a repeated star", async () => {
        const repo = await createRepo("stars");

        await starRequest(repo, otherToken);
        await starRequest(repo, otherToken);

        const notifications = await getOwnerNotifications();
        assert.equal(notifications.length, 1);
        assert.equal(notifications[0].type, "REPOSITORY_STARRED");
    });

    it("creates a fresh notification when the user stars again after unstarring", async () => {
        const repo = await createRepo("stars");

        await starRequest(repo, otherToken);
        await unstarRequest(repo, otherToken);
        await starRequest(repo, otherToken);

        const notifications = await getOwnerNotifications();
        assert.equal(notifications.length, 2);
    });
});

describe("notification creation: release published", () => {
    const publishRelease = async (repo) => {
        const commitId = await makeCommit(repo, "tagged", "tag.txt");
        const tagResponse = await tagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );
        assert.equal(tagResponse.status, 201);

        const created = await releaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        assert.equal(created.status, 201);
        const release = await created.json();

        const publish = await updateReleaseRequest(
            repo,
            release._id,
            { status: "published" },
            ownerToken
        );
        assert.equal(publish.status, 200);

        return release;
    };

    it("notifies repository participants when a release is published", async () => {
        const repo = await setupFastForwardRepo();
        await openPullRequest(repo, otherToken);
        await openIssue(repo, otherToken);

        const release = await publishRelease(repo);

        const otherNotifications = await getOtherNotifications();

        assert.equal(otherNotifications.length, 1);

        const notification = otherNotifications[0];
        assert.equal(notification.type, "RELEASE_PUBLISHED");
        assert.equal(
            notification.actor.userName,
            "owneruser"
        );
        assert.equal(
            notification.release._id.toString(),
            release._id.toString()
        );
        assert.equal(notification.release.tagName, "v1.0.0");

        const thirdNotificationsResponse = await listNotifications(
            "",
            thirdToken
        );
        const thirdNotifications = (await thirdNotificationsResponse.json())
            .notifications;
        assert.equal(thirdNotifications.length, 0);

        const ownerNotifications = await getOwnerNotifications();
        assert.equal(
            ownerNotifications.some(
                (n) => n.type === "RELEASE_PUBLISHED"
            ),
            false
        );
    });

    it("does not notify again on a repeated publish or draft edits", async () => {
        const repo = await setupFastForwardRepo();
        await openPullRequest(repo, otherToken);

        const commitId = await makeCommit(repo, "tagged", "tag.txt");
        await tagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const created = await releaseRequest(
            repo,
            { tagName: "v1.0.0", title: "Draft" },
            ownerToken
        );
        const release = await created.json();

        const edit = await updateReleaseRequest(
            repo,
            release._id,
            { title: "Edited draft" },
            ownerToken
        );
        assert.equal(edit.status, 200);

        const before = await getOtherNotifications();
        assert.equal(before.length, 0);

        await updateReleaseRequest(
            repo,
            release._id,
            { status: "published" },
            ownerToken
        );
        await updateReleaseRequest(
            repo,
            release._id,
            { status: "published" },
            ownerToken
        );

        const after = await getOtherNotifications();
        assert.equal(after.length, 1);
        assert.equal(after[0].type, "RELEASE_PUBLISHED");
    });
});

describe("notification creation: mentions", () => {
    it("creates a MENTION notification when a user is mentioned in an issue comment", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const response = await commentRequest(
            issue._id,
            "cc @thirduser please take a look",
            ownerToken
        );
        assert.equal(response.status, 201);

        const thirdResponse = await listNotifications("", thirdToken);
        const thirdNotifications = (await thirdResponse.json())
            .notifications;

        assert.equal(thirdNotifications.length, 1);

        const notification = thirdNotifications[0];
        assert.equal(notification.type, "MENTION");
        assert.equal(
            notification.actor.userName,
            "owneruser"
        );
        assert.equal(
            notification.issue._id.toString(),
            issue._id.toString()
        );
    });

    it("excludes the issue author from mention notifications", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const response = await commentRequest(
            issue._id,
            "thanks @otheruser",
            ownerToken
        );
        assert.equal(response.status, 201);

        const notifications = await getOtherNotifications();

        assert.equal(notifications.length, 1);
        assert.equal(notifications[0].type, "ISSUE_COMMENTED");
    });

    it("excludes the commenter from their own mention", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const response = await commentRequest(
            issue._id,
            "hi @otheruser",
            otherToken
        );
        assert.equal(response.status, 201);

        const notifications = await getOtherNotifications();
        assert.equal(notifications.length, 0);
    });

    it("creates MENTION notifications from pull request comments", async () => {
        const repo = await setupFastForwardRepo();
        const pr = await openPullRequest(repo, otherToken);

        const response = await prCommentRequest(
            repo,
            pr.number,
            "tagging @thirduser",
            ownerToken
        );
        assert.equal(response.status, 201);

        const thirdResponse = await listNotifications("", thirdToken);
        const thirdNotifications = (await thirdResponse.json())
            .notifications;

        assert.equal(thirdNotifications.length, 1);

        const notification = thirdNotifications[0];
        assert.equal(notification.type, "MENTION");
        assert.equal(
            notification.pullRequest._id.toString(),
            pr._id.toString()
        );
    });

    it("ignores mentions of users that do not exist", async () => {
        const repo = await createRepo("issues");
        const issue = await openIssue(repo, otherToken);

        const response = await commentRequest(
            issue._id,
            "ping @ghostuser",
            ownerToken
        );
        assert.equal(response.status, 201);

        const notifications = await getOtherNotifications();
        assert.equal(notifications.length, 1);
        assert.equal(notifications[0].type, "ISSUE_COMMENTED");
    });
});

describe("notification retrieval", () => {
    it("requires authentication", async () => {
        const response = await listNotifications("", null);
        assert.equal(response.status, 401);
    });

    it("lists only the authenticated user's notifications, newest first", async () => {
        const repo = await createRepo("retrieval");
        await openIssue(repo, otherToken);
        await starRequest(repo, otherToken);

        const notifications = await getOwnerNotifications();

        assert.equal(notifications.length, 2);
        assert.equal(notifications[0].type, "REPOSITORY_STARRED");
        assert.equal(notifications[1].type, "ISSUE_CREATED");

        const otherNotifications = await getOtherNotifications();
        assert.equal(otherNotifications.length, 0);
    });

    it("filters to unread notifications", async () => {
        const repo = await createRepo("retrieval");
        await openIssue(repo, otherToken);
        await starRequest(repo, otherToken);

        const response = await listNotifications(
            "unread=true",
            ownerToken
        );
        const body = await response.json();

        assert.equal(body.notifications.length, 2);
    });

    it("paginates notification lists", async () => {
        const repo = await createRepo("retrieval");
        await openIssue(repo, otherToken);
        await starRequest(repo, otherToken);

        const ownerIssue = await openIssue(repo, ownerToken);
        await commentRequest(ownerIssue._id, "thanks", otherToken);
        await starRequest(repo, thirdToken);

        const firstResponse = await listNotifications(
            "page=1&limit=2",
            ownerToken
        );
        const first = await firstResponse.json();

        assert.equal(first.notifications.length, 2);
        assert.equal(first.total, 4);
        assert.equal(first.pages, 2);

        const secondResponse = await listNotifications(
            "page=2&limit=2",
            ownerToken
        );
        const second = await secondResponse.json();

        assert.equal(second.notifications.length, 2);

        const seen = new Set(
            [
                ...first.notifications,
                ...second.notifications
            ].map((n) => n._id.toString())
        );
        assert.equal(seen.size, 4);
    });
});

describe("notification unread count", () => {
    it("returns the unread count for the authenticated user", async () => {
        const repo = await createRepo("unread");
        await openIssue(repo, otherToken);
        await starRequest(repo, otherToken);

        const response = await unreadCountRequest(ownerToken);
        const body = await response.json();

        assert.equal(body.unread, 2);

        const otherResponse = await unreadCountRequest(otherToken);
        const otherBody = await otherResponse.json();
        assert.equal(otherBody.unread, 0);
    });
});

describe("mark single notification as read", () => {
    it("marks only the target notification as read", async () => {
        const repo = await createRepo("read");
        await openIssue(repo, otherToken);
        await starRequest(repo, otherToken);

        const notifications = await getOwnerNotifications();
        const targetId = notifications[0]._id;

        const response = await markReadRequest(targetId, ownerToken);
        assert.equal(response.status, 200);

        const updated = await response.json();
        assert.equal(updated.read, true);

        const countResponse = await unreadCountRequest(ownerToken);
        const countBody = await countResponse.json();
        assert.equal(countBody.unread, 1);

        const remaining = await getOwnerNotifications();
        assert.equal(remaining[1].read, false);
    });

    it("rejects marking another user's notification as read", async () => {
        const repo = await createRepo("read");
        await openIssue(repo, otherToken);

        const notifications = await getOwnerNotifications();
        const targetId = notifications[0]._id;

        const response = await markReadRequest(targetId, otherToken);
        assert.equal(response.status, 404);
    });

    it("rejects an invalid notification id", async () => {
        const response = await markReadRequest(
            "not-an-id",
            ownerToken
        );
        assert.equal(response.status, 400);
    });
});

describe("mark all notifications as read", () => {
    it("marks all of the user's notifications as read", async () => {
        const repo = await createRepo("readall");
        await openIssue(repo, otherToken);
        await starRequest(repo, otherToken);
        await starRequest(repo, thirdToken);

        const response = await markAllReadRequest(ownerToken);
        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.modifiedCount, 3);

        const countResponse = await unreadCountRequest(ownerToken);
        const countBody = await countResponse.json();
        assert.equal(countBody.unread, 0);

        const otherCountResponse = await unreadCountRequest(
            otherToken
        );
        const otherCountBody = await otherCountResponse.json();
        assert.equal(otherCountBody.unread, 0);
    });

    it("is idempotent", async () => {
        const repo = await createRepo("readall");
        await openIssue(repo, otherToken);

        await markAllReadRequest(ownerToken);
        const response = await markAllReadRequest(ownerToken);
        const body = await response.json();
        assert.equal(body.modifiedCount, 0);
    });
});

describe("delete notifications", () => {
    it("deletes a notification without deleting the underlying issue", async () => {
        const repo = await createRepo("delete");
        const issue = await openIssue(repo, otherToken);

        const notifications = await getOwnerNotifications();
        const targetId = notifications[0]._id;

        const response = await deleteNotificationRequest(
            targetId,
            ownerToken
        );
        assert.equal(response.status, 200);

        const after = await getOwnerNotifications();
        assert.equal(after.length, 0);

        const issueDoc = await Issue.findById(issue._id);
        assert.ok(issueDoc);
    });

    it("rejects deleting another user's notification", async () => {
        const repo = await createRepo("delete");
        await openIssue(repo, otherToken);

        const notifications = await getOwnerNotifications();
        const targetId = notifications[0]._id;

        const response = await deleteNotificationRequest(
            targetId,
            otherToken
        );
        assert.equal(response.status, 404);
    });

    it("requires authentication", async () => {
        const repo = await createRepo("delete");
        await openIssue(repo, otherToken);

        const notifications = await getOwnerNotifications();
        const targetId = notifications[0]._id;

        const response = await deleteNotificationRequest(
            targetId,
            null
        );
        assert.equal(response.status, 401);
    });
});
