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
import repositoryRoutes from "../routes/repositoryRoutes.js";
import { getRepoRoot } from "../utils/repoStorage.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-branch-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_branch_test?");

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

const getRequest = (path, token) =>
    request(path, {
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

const listBranchesRequest = (repository, token) =>
    getRequest(`/api/repositories/${repository._id}/branches`, token);

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

const headFilePath = (repository) =>
    path.join(
        repoRoot(repository),
        ".CommitHub",
        "HEAD"
    );

const branchRefPath = (repository, branch) =>
    path.join(
        repoRoot(repository),
        ".CommitHub",
        "refs",
        "heads",
        branch
    );

const commitHeadCommit = async (repository, message = "commit") => {
    await createCommitRequest(
        repository,
        { message },
        ownerToken
    );
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
        Repository.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    await fs.promises.mkdir(storageRoot, { recursive: true });

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
        Repository.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });

    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("branch listing", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await listBranchesRequest(repo);

        assert.equal(response.status, 401);
    });

    it("returns 400 for an invalid repository ID", async () => {
        const response = await getRequest(
            "/api/repositories/not-an-id/branches",
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the repository does not exist", async () => {
        const response = await getRequest(
            `/api/repositories/${new mongoose.Types.ObjectId()}/branches`,
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("lists main as the current default branch with no commits yet", async () => {
        const repo = await createRepo("myrepo");

        const response = await listBranchesRequest(repo, ownerToken);

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.currentBranch, "main");
        assert.equal(body.branches.length, 1);
        assert.equal(body.branches[0].name, "main");
        assert.equal(body.branches[0].isCurrent, true);
        assert.equal(body.branches[0].isDefault, true);
        assert.equal(body.branches[0].commitId, null);
    });

    it("reports the commit ID a branch points at after a commit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo, "first");

        const response = await listBranchesRequest(repo, ownerToken);
        const body = await response.json();

        assert.ok(body.branches[0].commitId);
    });

    it("sorts the current branch first", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo, "first");
        await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );
        await checkoutRequest(repo, { name: "dev" }, ownerToken);

        const response = await listBranchesRequest(repo, ownerToken);
        const body = await response.json();

        assert.equal(body.currentBranch, "dev");
        assert.equal(body.branches[0].name, "dev");
        assert.equal(body.branches[0].isCurrent, true);

        const main = body.branches.find((branch) => branch.name === "main");

        assert.equal(main.isCurrent, false);
        assert.equal(main.isDefault, true);
    });

    it("allows any authenticated user to list a public repository's branches", async () => {
        const repo = await createRepo("myrepo");

        const response = await listBranchesRequest(repo, otherToken);

        assert.equal(response.status, 200);
    });

    it("returns 403 for a private repository's branches requested by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");

        const response = await listBranchesRequest(repo, otherToken);

        assert.equal(response.status, 403);
    });
});

describe("branch creation", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await createBranchRequest(
            repo,
            { name: "dev" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 403 for a private repository branched by a non-owner", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const response = await createBranchRequest(
            repo,
            { name: "dev" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 403 for a public repository branched by a non-owner", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const response = await createBranchRequest(
            repo,
            { name: "dev" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 400 when the branch name is missing or empty", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const missing = await createBranchRequest(
            repo,
            {},
            ownerToken
        );
        const empty = await createBranchRequest(
            repo,
            { name: "   " },
            ownerToken
        );

        assert.equal(missing.status, 400);
        assert.equal(empty.status, 400);
    });

    it("returns 400 for invalid branch names", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        for (const name of [
            "bad name",
            ".hidden",
            "..",
            "a..b",
            "/slash",
            "trail/ing",
            "-leading-dash",
            "",
            "x".repeat(64)
        ]) {
            const response = await createBranchRequest(
                repo,
                { name },
                ownerToken
            );

            assert.equal(
                response.status,
                400,
                `expected 400 for "${name}"`
            );
        }
    });

    it("returns 400 when there are no commits yet", async () => {
        const repo = await createRepo("myrepo");

        const response = await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        assert.equal(response.status, 400);

        const body = await response.json();

        assert.ok(body.message.includes("first commit"));
    });

    it("creates a branch pointing at the current head commit", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo, "first");

        const response = await createBranchRequest(
            repo,
            { name: "feature/x" },
            ownerToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.equal(body.name, "feature/x");
        assert.ok(body.commitId);

        assert.equal(
            (await fs.promises.readFile(
                branchRefPath(repo, "feature/x"),
                "utf-8"
            )).trim(),
            body.commitId
        );
    });

    it("records the branch in the repository document", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        const stored = await Repository.findById(repo._id);

        assert.ok(stored.branches.includes("dev"));
        assert.ok(stored.branches.includes("main"));
    });

    it("does not duplicate a branch that already exists", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );
        const second = await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        assert.equal(second.status, 400);

        const stored = await Repository.findById(repo._id);

        assert.equal(
            stored.branches.filter((branch) => branch === "dev").length,
            1
        );
    });
});

describe("branch checkout", () => {
    it("returns 401 without a token", async () => {
        const repo = await createRepo("myrepo");

        const response = await checkoutRequest(
            repo,
            { name: "main" }
        );

        assert.equal(response.status, 401);
    });

    it("returns 403 for a non-owner checkout on a private repository", async () => {
        const repo = await createRepo("myrepo", "private");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const response = await checkoutRequest(
            repo,
            { name: "main" },
            otherToken
        );

        assert.equal(response.status, 403);
    });

    it("returns 400 for an invalid branch name", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const response = await checkoutRequest(
            repo,
            { name: "bad name" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("returns 404 when the branch does not exist", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const response = await checkoutRequest(
            repo,
            { name: "nope" },
            ownerToken
        );

        assert.equal(response.status, 404);
    });

    it("reports switched false when already on the branch", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo);

        const response = await checkoutRequest(
            repo,
            { name: "main" },
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.switched, false);
        assert.equal(body.name, "main");
    });

    it("rejects a checkout with uncommitted changes", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo, "first");
        await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        await writeRepoFile(repo, "uncommitted.txt", "dirty");

        const response = await checkoutRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        assert.equal(response.status, 400);

        const body = await response.json();

        assert.ok(body.message.includes("uncommitted changes"));

        assert.equal(
            (await readRepoFile(repo, "uncommitted.txt")),
            "dirty"
        );
        assert.equal(
            (await fs.promises.readFile(headFilePath(repo), "utf-8")).trim(),
            "ref: refs/heads/main"
        );
    });

    it("discards uncommitted changes when force is set", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo, "first");
        await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        await writeRepoFile(repo, "uncommitted.txt", "dirty");

        const response = await checkoutRequest(
            repo,
            { name: "dev", force: true },
            ownerToken
        );

        assert.equal(response.status, 200);

        assert.equal(
            await fs.promises.readFile(
                path.join(repoRoot(repo), "uncommitted.txt"),
                "utf-8"
            ).then(() => "exists").catch(() => "gone"),
            "gone"
        );
        assert.equal(
            (await fs.promises.readFile(headFilePath(repo), "utf-8")).trim(),
            "ref: refs/heads/dev"
        );
    });

    it("materializes the target branch's working tree", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "shared.txt", "base");
        await commitHeadCommit(repo, "base commit");

        await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );
        await checkoutRequest(repo, { name: "dev" }, ownerToken);

        await writeRepoFile(repo, "dev-only.txt", "dev");
        await writeRepoFile(repo, "shared.txt", "dev version");
        await commitHeadCommit(repo, "dev work");

        const checkout = await checkoutRequest(
            repo,
            { name: "main" },
            ownerToken
        );

        assert.equal(checkout.status, 200);

        assert.equal(
            await readRepoFile(repo, "shared.txt"),
            "base"
        );
        assert.equal(
            await fs.promises.readFile(
                path.join(repoRoot(repo), "dev-only.txt"),
                "utf-8"
            ).then(() => "exists").catch(() => "gone"),
            "gone"
        );
        assert.equal(
            (await fs.promises.readFile(headFilePath(repo), "utf-8")).trim(),
            "ref: refs/heads/main"
        );

        const backToDev = await checkoutRequest(
            repo,
            { name: "dev" },
            ownerToken
        );

        assert.equal(backToDev.status, 200);
        assert.equal(await readRepoFile(repo, "dev-only.txt"), "dev");
        assert.equal(await readRepoFile(repo, "shared.txt"), "dev version");
    });

    it("prunes empty directories left by files not on the target branch", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "src/app.js", "app");
        await commitHeadCommit(repo, "base");

        await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "src/main.js", "main");
        await commitHeadCommit(repo, "dev work");

        await checkoutRequest(repo, { name: "main" }, ownerToken);

        assert.equal(
            await fs.promises.readdir(
                path.join(repoRoot(repo), "src")
            ).then(() => "exists").catch(() => "gone"),
            "gone"
        );
    });

    it("lets commits land on the checked-out branch", async () => {
        const repo = await createRepo("myrepo");
        await writeRepoFile(repo, "a.txt", "one");
        await commitHeadCommit(repo, "main one");

        await createBranchRequest(
            repo,
            { name: "dev" },
            ownerToken
        );
        await checkoutRequest(repo, { name: "dev" }, ownerToken);
        await writeRepoFile(repo, "b.txt", "two");
        await commitHeadCommit(repo, "dev two");

        assert.equal(
            (await fs.promises.readFile(
                branchRefPath(repo, "dev"),
                "utf-8"
            )).trim().length,
            12
        );
        assert.notEqual(
            (await fs.promises.readFile(
                branchRefPath(repo, "dev"),
                "utf-8"
            )).trim(),
            (await fs.promises.readFile(
                branchRefPath(repo, "main"),
                "utf-8"
            )).trim()
        );

        await checkoutRequest(repo, { name: "main" }, ownerToken);

        const mainHistory = await getRequest(
            `/api/repositories/${repo._id}/commits`,
            ownerToken
        );
        const mainBody = await mainHistory.json();

        assert.equal(mainBody.currentBranch, "main");
        assert.equal(mainBody.commits.length, 1);
        assert.equal(mainBody.commits[0].message, "main one");

        await checkoutRequest(repo, { name: "dev" }, ownerToken);

        const devHistory = await getRequest(
            `/api/repositories/${repo._id}/commits`,
            ownerToken
        );
        const devBody = await devHistory.json();

        assert.equal(devBody.currentBranch, "dev");
        assert.equal(devBody.commits.length, 2);
        assert.equal(devBody.commits[0].message, "dev two");
        assert.equal(devBody.commits[1].message, "main one");
    });
});
