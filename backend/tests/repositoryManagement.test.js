import {
    after,
    before,
    beforeEach,
    describe,
    it
} from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import express from "express";

import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import Issue from "../models/issueMode.js";
import Comment from "../models/commentModel.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";

dotenv.config();

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_test?");

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

const createIssue = async (repositoryId) =>
    Issue.create({
        title: "Sample bug",
        description: "Something is broken",
        repository: repositoryId,
        author: owner._id
    });

const createComment = async (issueId) =>
    Comment.create({
        content: "Looking into it",
        author: owner._id,
        issue: issueId
    });

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
        Comment.deleteMany({})
    ]);

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
        Issue.deleteMany({}),
        Comment.deleteMany({})
    ]);

    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("updateRepository", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { name: "newname" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await jsonRequest(
            "/api/repositories/not-an-id",
            "PATCH",
            { name: "newname" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await jsonRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}`,
            "PATCH",
            { name: "newname" },
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 403 for a non-owner", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { name: "hacked" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 400 for an empty repository name", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { name: "   " },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a non-string repository name", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { name: 42 },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 when the name is already taken by the owner", async () => {
        await createRepo("alpha");
        const repo = await createRepo("beta");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { name: "alpha" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for an invalid visibility", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { visibility: "spy" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 when no valid fields are provided", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { owner: other._id, stars: 99 },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("rejects unknown fields even when a valid field is present", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { name: "newname", owner: other._id },
            ownerToken
        );

        assert.equal(response.status, 200);

        const updated = await Repository.findById(repo._id);
        assert.equal(updated.name, "newname");
        assert.equal(
            updated.owner.toString(),
            owner._id.toString()
        );
    });

    it("updates name, description and visibility for the owner", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            {
                name: "renamed",
                description: "Fresh description",
                visibility: "private"
            },
            ownerToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.name, "renamed");
        assert.equal(data.description, "Fresh description");
        assert.equal(data.visibility, "private");
        assert.equal(data.owner._id.toString(), owner._id.toString());

        const persisted = await Repository.findById(repo._id);
        assert.equal(persisted.name, "renamed");
        assert.equal(persisted.visibility, "private");
    });

    it("supports partial updates", async () => {
        const repo = await createRepo("myrepo", "public");
        await Repository.updateOne(
            { _id: repo._id },
            { $set: { description: "Original description" } }
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { visibility: "private" },
            ownerToken
        );

        assert.equal(response.status, 200);

        const persisted = await Repository.findById(repo._id);
        assert.equal(persisted.visibility, "private");
        assert.equal(persisted.name, "myrepo");
        assert.equal(persisted.description, "Original description");
    });

    it("allows clearing the description", async () => {
        const repo = await createRepo("myrepo");
        await Repository.updateOne(
            { _id: repo._id },
            { $set: { description: "To be cleared" } }
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { description: "" },
            ownerToken
        );

        assert.equal(response.status, 200);

        const persisted = await Repository.findById(repo._id);
        assert.equal(persisted.description, "");
    });

    it("keeps the stars count and branches untouched", async () => {
        const repo = await createRepo("myrepo");
        await Repository.updateOne(
            { _id: repo._id },
            { $set: { stars: 7 } }
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "PATCH",
            { name: "renamed" },
            ownerToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.stars, 7);
        assert.deepEqual(data.branches, ["main"]);
    });
});

describe("deleteRepository", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await request(
            `/api/repositories/${repo._id}`,
            { method: "DELETE" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await jsonRequest(
            "/api/repositories/not-an-id",
            "DELETE",
            null,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await jsonRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}`,
            "DELETE",
            null,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 403 for a non-owner", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "DELETE",
            null,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("deletes the repository and returns a success message", async () => {
        const repo = await createRepo("myrepo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "DELETE",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.message, "Repository deleted");

        const remaining = await Repository.findById(repo._id);
        assert.equal(remaining, null);
    });

    it("cascades the delete to issues and comments", async () => {
        const repo = await createRepo("myrepo");
        const issue = await createIssue(repo._id);
        await createComment(issue._id);

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "DELETE",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        assert.equal(await Issue.findById(issue._id), null);
        assert.equal(
            await Comment.countDocuments({ issue: issue._id }),
            0
        );
        assert.equal(
            await Issue.countDocuments({ repository: repo._id }),
            0
        );
    });

    it("pulls the deleted repository from every user's starRepo", async () => {
        const repo = await createRepo("myrepo", "public");

        await User.collection.updateOne(
            { _id: other._id },
            { $addToSet: { starRepo: repo._id } }
        );
        await User.collection.updateOne(
            { _id: owner._id },
            { $addToSet: { starRepo: repo._id } }
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "DELETE",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        const refreshedOwner = await User.findById(owner._id);
        const refreshedOther = await User.findById(other._id);
        assert.equal(refreshedOwner.starRepo.length, 0);
        assert.equal(refreshedOther.starRepo.length, 0);
    });

    it("deletes a repository that has no issues", async () => {
        const repo = await createRepo("empty-repo");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "DELETE",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);
        assert.equal(await Repository.findById(repo._id), null);
    });
});

describe("createRepository", () => {
    it("returns 401 without a token", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "myrepo" }
        );

        assert.equal(response.status, 401);
    });

    it("creates a repository owned by the authenticated user", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            {
                name: "myrepo",
                description: "My first repo",
                visibility: "public"
            },
            ownerToken
        );

        assert.equal(response.status, 201);

        const data = await response.json();
        assert.equal(data.name, "myrepo");
        assert.equal(data.description, "My first repo");
        assert.equal(data.visibility, "public");
        assert.equal(data.owner.toString(), owner._id.toString());
        assert.deepEqual(data.branches, ["main"]);
    });

    it("ignores the owner field from the request body", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "no-spoof", owner: other._id },
            ownerToken
        );

        assert.equal(response.status, 201);

        const data = await response.json();
        assert.equal(data.owner.toString(), owner._id.toString());

        const persisted = await Repository.findById(data._id);
        assert.equal(persisted.owner.toString(), owner._id.toString());
    });

    it("returns 400 for a duplicate name by the same owner", async () => {
        await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "myrepo" },
            ownerToken
        );

        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "myrepo" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("allows the same name for a different owner", async () => {
        await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "shared" },
            ownerToken
        );

        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "shared" },
            otherToken
        );

        assert.equal(response.status, 201);
    });

    it("returns 400 for an empty repository name", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "   " },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for a non-string repository name", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: 42 },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 400 for an invalid visibility", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "myrepo", visibility: "spy" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("trims whitespace around the repository name", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "  padded-name  " },
            ownerToken
        );

        assert.equal(response.status, 201);

        const data = await response.json();
        assert.equal(data.name, "padded-name");
    });

    it("adds the repository to the owner's repositories array", async () => {
        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "linked-repo" },
            ownerToken
        );

        assert.equal(response.status, 201);

        const data = await response.json();

        const refreshedOwner = await User.findById(owner._id);
        const hasRepo = refreshedOwner.repositories.some(
            (repoId) => repoId.toString() === data._id
        );
        assert.equal(hasRepo, true);
    });
});

describe("getRepositories", () => {
    it("returns 401 without a token", async () => {
        const response = await request("/api/repositories");

        assert.equal(response.status, 401);
    });

    it("returns only the authenticated user's repositories", async () => {
        await createRepo("owner-repo");
        await Repository.create({
            name: "other-repo",
            owner: other._id,
            branches: ["main"]
        });

        const response = await jsonRequest(
            "/api/repositories",
            "GET",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.length, 1);
        assert.equal(data[0].name, "owner-repo");
    });
});

describe("getRepositoryById", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await request(
            `/api/repositories/${repo._id}`
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await jsonRequest(
            "/api/repositories/not-an-id",
            "GET",
            null,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await jsonRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}`,
            "GET",
            null,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns a public repository to any authenticated user", async () => {
        const repo = await createRepo("public-repo", "public");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "GET",
            null,
            otherToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.name, "public-repo");
        assert.equal(data.isOwner, false);
    });

    it("returns 403 for a private repository requested by a non-owner", async () => {
        const repo = await createRepo("private-repo", "private");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "GET",
            null,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns a private repository to its owner", async () => {
        const repo = await createRepo("owner-private", "private");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "GET",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.isOwner, true);
        assert.equal(data.owner._id.toString(), owner._id.toString());
    });

    it("returns isStarred based on the authenticated user's starRepo", async () => {
        const repo = await createRepo("starred-repo", "public");

        await User.collection.updateOne(
            { _id: other._id },
            { $addToSet: { starRepo: repo._id } }
        );

        const starredResponse = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "GET",
            null,
            otherToken
        );

        const starredData = await starredResponse.json();
        assert.equal(starredData.isStarred, true);

        const unstarredResponse = await jsonRequest(
            `/api/repositories/${repo._id}`,
            "GET",
            null,
            ownerToken
        );

        const unstarredData = await unstarredResponse.json();
        assert.equal(unstarredData.isStarred, false);
    });
});

describe("starRepository", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await request(
            `/api/repositories/${repo._id}/star`,
            { method: "PATCH" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await jsonRequest(
            "/api/repositories/not-an-id/star",
            "PATCH",
            null,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await jsonRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}/star`,
            "PATCH",
            null,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("returns 403 when starring a private repository as a non-owner", async () => {
        const repo = await createRepo("private-repo", "private");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/star`,
            "PATCH",
            null,
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("stars a public repository and increments the count once", async () => {
        const repo = await createRepo("public-repo", "public");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/star`,
            "PATCH",
            null,
            otherToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.isStarred, true);
        assert.equal(data.stars, 1);

        const refreshed = await Repository.findById(repo._id);
        assert.equal(refreshed.stars, 1);
    });

    it("allows the owner to star their own private repository", async () => {
        const repo = await createRepo("own-repo", "private");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/star`,
            "PATCH",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.isStarred, true);
        assert.equal(data.stars, 1);
    });

    it("does not double-count when starring twice", async () => {
        const repo = await createRepo("twice-repo", "public");

        await jsonRequest(
            `/api/repositories/${repo._id}/star`,
            "PATCH",
            null,
            ownerToken
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/star`,
            "PATCH",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.stars, 1);

        const refreshed = await Repository.findById(repo._id);
        assert.equal(refreshed.stars, 1);

        const refreshedUser = await User.findById(owner._id);
        assert.equal(refreshedUser.starRepo.length, 1);
    });
});

describe("unstarRepository", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await request(
            `/api/repositories/${repo._id}/unstar`,
            { method: "PATCH" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await jsonRequest(
            "/api/repositories/not-an-id/unstar",
            "PATCH",
            null,
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await jsonRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}/unstar`,
            "PATCH",
            null,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("unstars a starred repository and decrements the count once", async () => {
        const repo = await createRepo("star-then-unstar", "public");

        await jsonRequest(
            `/api/repositories/${repo._id}/star`,
            "PATCH",
            null,
            ownerToken
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/unstar`,
            "PATCH",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.isStarred, false);
        assert.equal(data.stars, 0);

        const refreshed = await Repository.findById(repo._id);
        assert.equal(refreshed.stars, 0);

        const refreshedUser = await User.findById(owner._id);
        assert.equal(refreshedUser.starRepo.length, 0);
    });

    it("does not corrupt the count when unstarring a repository that was never starred", async () => {
        const repo = await createRepo("never-starred", "public");

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/unstar`,
            "PATCH",
            null,
            otherToken
        );

        assert.equal(response.status, 200);

        const data = await response.json();
        assert.equal(data.stars, 0);

        const refreshed = await Repository.findById(repo._id);
        assert.equal(refreshed.stars, 0);
    });

    it("does not decrement below zero on repeated unstar", async () => {
        const repo = await createRepo("floor-repo", "public");

        await jsonRequest(
            `/api/repositories/${repo._id}/unstar`,
            "PATCH",
            null,
            ownerToken
        );

        const response = await jsonRequest(
            `/api/repositories/${repo._id}/unstar`,
            "PATCH",
            null,
            ownerToken
        );

        assert.equal(response.status, 200);

        const refreshed = await Repository.findById(repo._id);
        assert.equal(refreshed.stars, 0);
    });

    it("keeps the count consistent across concurrent star requests from the same user", async () => {
        const repo = await createRepo("concurrent-repo", "public");

        await Promise.all(
            Array.from({ length: 5 }, () =>
                jsonRequest(
                    `/api/repositories/${repo._id}/star`,
                    "PATCH",
                    null,
                    otherToken
                )
            )
        );

        const refreshed = await Repository.findById(repo._id);
        assert.equal(refreshed.stars, 1);

        const refreshedUser = await User.findById(other._id);
        assert.equal(refreshedUser.starRepo.length, 1);
    });
});
