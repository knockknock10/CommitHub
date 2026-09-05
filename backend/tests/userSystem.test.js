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
import userRoutes from "../routes/userRoutes.js";
import { tokenFor, createUser } from "./helpers/auth.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-user-test-")
);
process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_user_test?");

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use("/api/users", userRoutes);

let server;
let baseUrl;

const request = (path, options = {}) =>
    fetch(`${baseUrl}${path}`, options);

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
    await Repository.deleteMany({});
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

describe("User profile", () => {
    it("returns an authenticated user's profile by id", async () => {
        const user = await createUser(User, "alice", "alice@test.com");

        const response = await getRequest(
            `/api/users/profile/${user._id}`,
            tokenFor(user._id)
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.userName, "alice");
        assert.equal(body.email, "alice@test.com");
        assert.equal(body._id.toString(), user._id.toString());
        assert.ok(Array.isArray(body.repositories));
    });

    it("allows authenticated users to view each other's profile", async () => {
        const alice = await createUser(User, "alice", "alice@test.com");
        const bob = await createUser(User, "bob", "bob@test.com");

        const response = await getRequest(
            `/api/users/profile/${bob._id}`,
            tokenFor(alice._id)
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.userName, "bob");
    });

    it("does not leak private repositories to other users", async () => {
        const alice = await createUser(User, "alice", "alice@test.com");
        const bob = await createUser(User, "bob", "bob@test.com");

        const publicRepo = await Repository.create({
            name: "public-thing",
            visibility: "public",
            owner: alice._id,
            branches: ["main"]
        });

        const privateRepo = await Repository.create({
            name: "secret-thing",
            visibility: "private",
            owner: alice._id,
            branches: ["main"]
        });

        await User.updateOne(
            { _id: alice._id },
            {
                $addToSet: {
                    repositories: {
                        $each: [publicRepo._id, privateRepo._id]
                    }
                }
            }
        );

        const bobView = await getRequest(
            `/api/users/profile/${alice._id}`,
            tokenFor(bob._id)
        );

        assert.equal(bobView.status, 200);
        const bobBody = await bobView.json();
        assert.ok(
            bobBody.repositories.some((r) => r.name === "public-thing")
        );
        assert.equal(
            bobBody.repositories.some((r) => r.name === "secret-thing"),
            false
        );

        const aliceView = await getRequest(
            `/api/users/profile/${alice._id}`,
            tokenFor(alice._id)
        );

        assert.equal(aliceView.status, 200);
        const aliceBody = await aliceView.json();
        assert.ok(
            aliceBody.repositories.some((r) => r.name === "secret-thing")
        );
    });

    it("returns 401 without a token", async () => {
        const user = await createUser(User, "alice", "alice@test.com");

        const response = await getRequest(`/api/users/profile/${user._id}`);

        assert.equal(response.status, 401);
    });

    it("returns 404 for a nonexistent user id", async () => {
        const viewer = await createUser(User, "alice", "alice@test.com");

        const response = await getRequest(
            `/api/users/profile/507f1f77bcf86cd799439011`,
            tokenFor(viewer._id)
        );

        assert.equal(response.status, 404);
    });
});
