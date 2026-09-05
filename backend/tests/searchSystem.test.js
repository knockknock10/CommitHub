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
import searchRoutes from "../routes/searchRoutes.js";
import { tokenFor, createUser } from "./helpers/auth.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-search-test-")
);
process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_search_test?");

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use("/api/search", searchRoutes);

let server;
let baseUrl;

const request = (path, options = {}) =>
    fetch(`${baseUrl}${path}`, options);

const getRequest = (path, token) =>
    request(path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

let owner;
let ownerToken;

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

    owner = await createUser(User, "searchowner", "search@test.com");
    ownerToken = tokenFor(owner._id);
});

after(async () => {
    await User.deleteMany({});
    await Repository.deleteMany({});
    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("Global search", () => {
    it("returns matching repositories and users", async () => {
        await Repository.create({
            name: "react-dashboard",
            description: "A dashboard built with react",
            visibility: "public",
            owner: owner._id,
            branches: ["main"]
        });
        await createUser(User, "reactmaster", "react@test.com");

        const response = await getRequest("/api/search?q=react", ownerToken);

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.ok(Array.isArray(body.repositories));
        assert.ok(Array.isArray(body.users));
        assert.ok(
            body.repositories.some((r) => r.name === "react-dashboard")
        );
        assert.ok(body.users.some((u) => u.userName === "reactmaster"));
    });

    it("rejects a query shorter than 3 characters", async () => {
        const response = await getRequest("/api/search?q=re", ownerToken);

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.match(body.message, /at least 3 characters/i);
    });

    it("returns no matches for an unrelated query", async () => {
        await Repository.create({
            name: "react-dashboard",
            description: "A dashboard built with react",
            visibility: "public",
            owner: owner._id,
            branches: ["main"]
        });

        const response = await getRequest("/api/search?q=zzzznope", ownerToken);

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.repositories.length, 0);
        assert.equal(body.users.length, 0);
    });

    it("returns an owner's own private repositories", async () => {
        await Repository.create({
            name: "secret-project",
            description: "private work",
            visibility: "private",
            owner: owner._id,
            branches: ["main"]
        });

        const response = await getRequest(
            "/api/search?q=secret-project",
            ownerToken
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.ok(
            body.repositories.some((r) => r.name === "secret-project")
        );
    });

    it("hides private repositories from users without access", async () => {
        await Repository.create({
            name: "secret-project",
            description: "private work",
            visibility: "private",
            owner: owner._id,
            branches: ["main"]
        });

        const stranger = await createUser(
            User,
            "stranger",
            "stranger@test.com"
        );

        const response = await getRequest(
            "/api/search?q=secret-project",
            tokenFor(stranger._id)
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(
            body.repositories.some((r) => r.name === "secret-project"),
            false
        );
    });

    it("requires authentication", async () => {
        const response = await getRequest("/api/search?q=react");
        assert.equal(response.status, 401);
    });
});
