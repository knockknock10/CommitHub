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

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-perf-test-")
);
process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_perf_test?");

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

/* These guards are deliberately lenient (an upper bound on wall-clock time,
   generous enough for a shared development database) so they catch genuine
   regressions such as an N+1 pattern or an accidental serial loop, without
   becoming flaky on slow CI machines. */

describe("Performance regression", () => {
    it("signup completes within a generous upper bound", async () => {
        const started = Date.now();

        const response = await jsonRequest(
            "/api/auth/signup",
            "POST",
            { userName: "perfuser", email: "perf@test.com", password: "password123" }
        );

        const elapsed = Date.now() - started;
        assert.equal(response.status, 201);
        assert.ok(elapsed < 2000, `signup took ${elapsed}ms`);
    });

    it("creating ten repositories does not exhibit a linear explosion", async () => {
        const owner = await createUser(User, "perfowner", "perfowner@test.com");
        const token = tokenFor(owner._id);

        const started = Date.now();
        for (let i = 0; i < 10; i += 1) {
            const response = await jsonRequest(
                "/api/repositories",
                "POST",
                { name: `repo-${i}` },
                token
            );
            assert.equal(response.status, 201);
        }
        const elapsed = Date.now() - started;

        const count = await Repository.countDocuments({ owner: owner._id });
        assert.equal(count, 10);
        assert.ok(elapsed < 5000, `10 creations took ${elapsed}ms`);
    });

    it("handles concurrent repository creations without data loss or duplicates", async () => {
        const owner = await createUser(User, "perfowner2", "perfowner2@test.com");
        const token = tokenFor(owner._id);

        const responses = await Promise.all(
            Array.from({ length: 5 }, (_, i) =>
                jsonRequest(
                    "/api/repositories",
                    "POST",
                    { name: `concurrent-${i}` },
                    token
                )
            )
        );

        for (const response of responses) {
            assert.equal(response.status, 201);
        }

        const names = await Repository.find({ owner: owner._id }).select("name");
        assert.equal(names.length, 5);
        const uniqueNames = new Set(names.map((r) => r.name));
        assert.equal(uniqueNames.size, 5);
    });
});
