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
import dotenv from "dotenv";
import express from "express";

import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import Activity from "../models/activityModel.js";
import { tokenFor, createUser } from "./helpers/auth.js";
import authRoutes from "../routes/auth.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import userRoutes from "../routes/userRoutes.js";
import notificationRoutes from "../routes/notificationRoutes.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-contract-test-")
);
process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_contract_test?");

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/repositories", repositoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

let server;
let baseUrl;

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
let otherUser;
let ownerToken;
let otherUserToken;

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
        Activity.deleteMany({})
    ]);
    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    await fs.promises.mkdir(storageRoot, { recursive: true });

    owner = await createUser(User, "testuser", "test@contract.com");
    otherUser = await createUser(User, "otheruser", "other@contract.com");
    ownerToken = tokenFor(owner._id);
    otherUserToken = tokenFor(otherUser._id);
});

after(async () => {
    await Promise.all([
        User.deleteMany({}),
        Repository.deleteMany({}),
        Activity.deleteMany({})
    ]);
    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

const createRepo = async (name, visibility = "public") => {
    const response = await jsonRequest(
        "/api/repositories",
        "POST",
        { name, visibility },
        ownerToken
    );
    assert.equal(response.status, 201);
    return response.json();
};

describe("Auth Contract", () => {
    it("signup returns a token and user with the fields the frontend reads", async () => {
        const response = await jsonRequest(
            "/api/auth/signup",
            "POST",
            { userName: "alice", email: "alice@signup.com", password: "password123" }
        );

        assert.equal(response.status, 201);
        const body = await response.json();
        assert.ok(typeof body.token === "string");
        assert.ok(body.user);
        assert.ok(body.user._id);
        assert.equal(body.user.userName, "alice");
        assert.equal(body.user.email, "alice@signup.com");
    });

    it("login returns a token and user", async () => {
        await createUser(User, "alice", "alice@login.com");

        const response = await jsonRequest(
            "/api/auth/login",
            "POST",
            { email: "alice@login.com", password: "password123" }
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.ok(body.token);
        assert.equal(body.user.userName, "alice");
    });
});

describe("User Contract", () => {
    it("profile returns the fields the frontend reads", async () => {
        const response = await getRequest(
            `/api/users/profile/${owner._id}`,
            ownerToken
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.ok(body._id);
        assert.equal(body.userName, "testuser");
        assert.equal(body.email, "test@contract.com");
        assert.ok(Array.isArray(body.repositories));
    });
});

describe("Repository Contract", () => {
    it("create repository returns the fields the frontend reads", async () => {
        const body = await createRepo("contract-repo");

        assert.ok(body._id);
        assert.equal(body.name, "contract-repo");
        assert.equal(body.visibility, "public");
        assert.ok(body.owner);
        assert.ok(Array.isArray(body.branches));
        assert.ok(body.branches.includes("main"));
    });

    it("rejects a duplicate repository name for the same owner", async () => {
        await createRepo("contract-repo");

        const response = await jsonRequest(
            "/api/repositories",
            "POST",
            { name: "contract-repo" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("list repositories returns an array the frontend iterates", async () => {
        await createRepo("repo-a");
        await createRepo("repo-b");

        const response = await getRequest("/api/repositories", ownerToken);
        assert.equal(response.status, 200);

        const body = await response.json();
        assert.ok(Array.isArray(body));
        assert.ok(body.length >= 2);
        const repo = body[0];
        assert.ok(repo._id);
        assert.ok(repo.name);
        assert.ok(repo.visibility);
    });

    it("get repository by id returns owner as a populated object and isOwner", async () => {
        const repo = await createRepo("detail-repo");

        const response = await getRequest(`/api/repositories/${repo._id}`, ownerToken);
        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.name, "detail-repo");
        assert.ok(body.owner);
        assert.equal(body.owner._id.toString(), owner._id.toString());
        assert.equal(body.isOwner, true);
        assert.equal(typeof body.isStarred, "boolean");
    });

    it("denies a non-owner access to a private repository", async () => {
        const repo = await createRepo("private-repo", "private");

        const response = await getRequest(
            `/api/repositories/${repo._id}`,
            otherUserToken
        );

        assert.equal(response.status, 403);
    });

    it("get branches returns the branches array and current branch", async () => {
        const repo = await createRepo("branch-repo");

        const response = await getRequest(`/api/repositories/${repo._id}/branches`, ownerToken);
        assert.equal(response.status, 200);

        const body = await response.json();
        assert.ok(Array.isArray(body.branches));
        assert.ok(body.branches.some((b) => b.name === "main"));
        assert.ok(body.currentBranch);
    });
});
