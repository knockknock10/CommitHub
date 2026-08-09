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
    server.close();
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
