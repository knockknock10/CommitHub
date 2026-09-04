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
import authRoutes from "../routes/auth.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import { tokenFor, invalidToken, malformedToken, expiredTokenFor, createUser } from "./helpers/auth.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-auth-test-")
);
process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_auth_test?");

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/repositories", repositoryRoutes);

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

before(async () => {
    await mongoose.connect(mongoUri);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
    await User.deleteMany({});
    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    await fs.promises.mkdir(storageRoot, { recursive: true });
});

after(async () => {
    await User.deleteMany({});
    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("Signup", () => {
    it("creates a user and returns a token with user profile", async () => {
        const response = await jsonRequest(
            "/api/auth/signup",
            "POST",
            { userName: "alice", email: "alice@test.com", password: "password123" }
        );

        assert.equal(response.status, 201);
        const body = await response.json();
        assert.ok(body.token);
        assert.equal(body.user.userName, "alice");
        assert.equal(body.user.email, "alice@test.com");
        assert.ok(body.user._id);
    });

    it("returns 400 for a duplicate email", async () => {
        await createUser(User, "alice", "alice@test.com");

        const response = await jsonRequest(
            "/api/auth/signup",
            "POST",
            { userName: "alice2", email: "alice@test.com", password: "password123" }
        );

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.ok(body.message);
    });
});

describe("Login", () => {
    it("returns a token for valid credentials", async () => {
        await createUser(User, "alice", "alice@test.com");

        const response = await jsonRequest(
            "/api/auth/login",
            "POST",
            { email: "alice@test.com", password: "password123" }
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.ok(body.token);
        assert.equal(body.user.userName, "alice");
    });

    it("returns 401 for wrong password", async () => {
        await createUser(User, "alice", "alice@test.com");

        const response = await jsonRequest(
            "/api/auth/login",
            "POST",
            { email: "alice@test.com", password: "wrong-password" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 401 for unknown email", async () => {
        const response = await jsonRequest(
            "/api/auth/login",
            "POST",
            { email: "nobody@test.com", password: "password123" }
        );

        assert.equal(response.status, 401);
    });
});

describe("Protected route authorization", () => {
    it("allows access with a valid token", async () => {
        const user = await createUser(User, "alice", "alice@test.com");
        const token = tokenFor(user._id);

        const response = await getRequest("/api/repositories", token);

        assert.equal(response.status, 200);
    });

    it("returns 401 with no token", async () => {
        const response = await getRequest("/api/repositories");

        assert.equal(response.status, 401);
        const body = await response.json();
        assert.equal(body.message, "No token provided");
    });

    it("returns 401 with a malformed token", async () => {
        const response = await getRequest("/api/repositories", invalidToken);

        assert.equal(response.status, 401);
        const body = await response.json();
        assert.equal(body.message, "Not authorized");
    });

    it("returns 401 with a token signed by a different secret", async () => {
        const user = await createUser(User, "alice", "alice@test.com");

        const response = await getRequest(
            "/api/repositories",
            malformedToken(user._id)
        );

        assert.equal(response.status, 401);
    });

    it("returns 401 with an expired token", async () => {
        const user = await createUser(User, "alice", "alice@test.com");

        const response = await getRequest(
            "/api/repositories",
            expiredTokenFor(user._id)
        );

        assert.equal(response.status, 401);
    });
});
