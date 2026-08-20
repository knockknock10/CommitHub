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
import {
    ensureVersionControl,
    getBranchCommitId,
    createBranch,
    checkoutBranch,
    getSnapshot
} from "../utils/repoVersion.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-merge-exec-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace(
        "/commithub?",
        "/commithub_merge_exec_test?"
    );

const app = express();

app.use(express.json());
app.use("/api/repositories", repositoryRoutes);

let server;
let baseUrl;

const tokenFor = (userId) =>
    jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, {
        expiresIn: "1h"
    });

const request = (url, options = {}) =>
    fetch(`${baseUrl}${url}`, options);

const jsonRequest = (url, method, body, token) =>
    request(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });

const getRequest = (url, token) =>
    request(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

let owner;
let ownerToken;

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

const commitAll = async (repository, message, token) => {
    const response = await jsonRequest(
        `/api/repositories/${repository._id}/commits`,
        "POST",
        { message },
        token
    );
    return response.json();
};

const setupFeatureBranch = async (repo, branchName, token) => {
    await createBranch(repoRoot(repo), branchName);
    await repo.updateOne({ $push: { branches: branchName } });
    await checkoutBranch(repoRoot(repo), branchName, { force: true });
};

const switchToMain = async (repo) =>
    checkoutBranch(repoRoot(repo), "main", { force: true });

const readBranchCommitId = async (repo, branch) =>
    getBranchCommitId(repoRoot(repo), branch);

const readSnapshot = async (repo, commitId) => {
    const vcRoot = await ensureVersionControl(repoRoot(repo));
    return getSnapshot(vcRoot, commitId);
};

const readFileFromSnapshot = async (snapshot, filePath) => {
    const fullPath = path.join(snapshot.root, filePath);
    return fs.promises.readFile(fullPath, "utf-8");
};

before(async () => {
    await mongoose.connect(mongoUri);
    await User.deleteMany({});
    await Repository.deleteMany({});
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;

    owner = await User.create({
        userName: "mergeexecowner",
        email: "mergeexec@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    ownerToken = tokenFor(owner._id);
});

after(async () => {
    await User.deleteMany({});
    await Repository.deleteMany({});
    await mongoose.disconnect();
    server.close();
    await fs.promises.rm(storageRoot, {
        recursive: true,
        force: true
    });
});

beforeEach(async () => {
    await User.deleteMany({});
    await Repository.deleteMany({});

    owner = await User.create({
        userName: "mergeexecowner",
        email: "mergeexec@test.com",
        password: await bcrypt.hash("password123", 10)
    });
    ownerToken = tokenFor(owner._id);
});

const mergeUrl = (repo, source, target) =>
    `/api/repositories/${repo._id}/merge` +
    `?source=${encodeURIComponent(source)}` +
    `&target=${encodeURIComponent(target)}`;

describe("branch merge execution", () => {
    describe("already up to date", () => {
        it("returns up_to_date when branches point to the same commit", async () => {
            const repo = await createRepo("merge-same");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await switchToMain(repo);

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 400);
            assert.equal(body.status, "up_to_date");
            assert.equal(body.sourceBranch, "feature");
            assert.equal(body.targetBranch, "main");
            assert.equal(body.sourceCommitId, body.targetCommitId);
        });
    });

    describe("fast-forward merge", () => {
        it("fast-forwards target to source when target is behind", async () => {
            const repo = await createRepo("merge-ff");
            await writeRepoFile(repo, "a.txt", "initial");
            const initial = await commitAll(repo, "initial", ownerToken);
            const initialCommitId = initial.id;

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "feature work");
            const featureCommit = await commitAll(
                repo, "feature commit", ownerToken
            );
            const featureCommitId = featureCommit.id;

            await switchToMain(repo);

            const targetBefore = await readBranchCommitId(repo, "main");
            assert.equal(targetBefore, initialCommitId);

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "fast_forward");
            assert.equal(body.sourceBranch, "feature");
            assert.equal(body.targetBranch, "main");
            assert.equal(body.sourceCommitId, featureCommitId);
            assert.equal(body.targetCommitId, featureCommitId);
            assert.equal(body.previousTargetCommitId, initialCommitId);

            const targetAfter = await readBranchCommitId(repo, "main");
            assert.equal(targetAfter, featureCommitId);

            const featureAfter = await readBranchCommitId(repo, "feature");
            assert.equal(featureAfter, featureCommitId);
        });

        it("preserves all source commits after fast-forward", async () => {
            const repo = await createRepo("merge-ff-history");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "second");
            await commitAll(repo, "second commit", ownerToken);

            await writeRepoFile(repo, "c.txt", "third");
            await commitAll(repo, "third commit", ownerToken);

            await switchToMain(repo);

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "fast_forward");

            const mainCommit = await readBranchCommitId(repo, "main");
            const snapshot = await readSnapshot(repo, mainCommit);
            const files = new Set(snapshot.files);
            assert.ok(files.has("a.txt"));
            assert.ok(files.has("b.txt"));
            assert.ok(files.has("c.txt"));
        });
    });

    describe("diverged branch merge (merge commit)", () => {
        it("creates a merge commit when branches have diverged without conflicts", async () => {
            const repo = await createRepo("merge-diverged");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "feature change");
            await commitAll(repo, "feature commit", ownerToken);

            await switchToMain(repo);

            await writeRepoFile(repo, "c.txt", "main change");
            await commitAll(repo, "main commit", ownerToken);

            const mainBefore = await readBranchCommitId(repo, "main");

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.status, "merge_commit");
            assert.equal(body.sourceBranch, "feature");
            assert.equal(body.targetBranch, "main");
            assert.ok(body.mergeCommitId);
            assert.equal(body.targetCommitId, mainBefore);

            const mainAfter = await readBranchCommitId(repo, "main");
            assert.equal(mainAfter, body.mergeCommitId);
            assert.notEqual(mainAfter, mainBefore);
        });

        it("merge commit has the correct default message", async () => {
            const repo = await createRepo("merge-msg");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "feature change");
            await commitAll(repo, "feature commit", ownerToken);

            await switchToMain(repo);

            await writeRepoFile(repo, "c.txt", "main change");
            await commitAll(repo, "main commit", ownerToken);

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);

            const vcRoot = await ensureVersionControl(repoRoot(repo));

            const metaRaw = await fs.promises.readFile(
                path.join(
                    vcRoot, "commits", body.mergeCommitId, "meta.json"
                ),
                "utf-8"
            );
            const meta = JSON.parse(metaRaw);

            assert.equal(
                meta.message,
                "Merge 'feature' into 'main'"
            );
            assert.equal(meta.merge, true);
            assert.ok(meta.parents.includes(body.targetCommitId));
            assert.ok(meta.parents.includes(body.sourceCommitId));
            assert.equal(meta.parents.length, 2);
        });

        it("merge commit snapshot contains files from both branches", async () => {
            const repo = await createRepo("merge-snapshot");
            await writeRepoFile(repo, "a.txt", "shared");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "from feature");
            await commitAll(repo, "feature add", ownerToken);

            await switchToMain(repo);

            await writeRepoFile(repo, "c.txt", "from main");
            await commitAll(repo, "main add", ownerToken);

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);

            const snapshot = await readSnapshot(repo, body.mergeCommitId);
            const files = new Set(snapshot.files);
            assert.ok(files.has("a.txt"));
            assert.ok(files.has("b.txt"));
            assert.ok(files.has("c.txt"));

            const bContent = await readFileFromSnapshot(snapshot, "b.txt");
            assert.equal(bContent, "from feature");

            const cContent = await readFileFromSnapshot(snapshot, "c.txt");
            assert.equal(cContent, "from main");
        });

        it("source branch remains unchanged after merge commit", async () => {
            const repo = await createRepo("merge-source-unchanged");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "feature work");
            await commitAll(repo, "feature commit", ownerToken);

            const featureBefore = await readBranchCommitId(repo, "feature");

            await switchToMain(repo);

            await writeRepoFile(repo, "c.txt", "main work");
            await commitAll(repo, "main commit", ownerToken);

            await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );

            const featureAfter = await readBranchCommitId(repo, "feature");
            assert.equal(featureAfter, featureBefore);
        });

        it("target branch points to the merge commit after diverged merge", async () => {
            const repo = await createRepo("merge-target-ref");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "feature");
            await commitAll(repo, "feature work", ownerToken);

            await switchToMain(repo);

            await writeRepoFile(repo, "c.txt", "main");
            await commitAll(repo, "main work", ownerToken);

            const targetBefore = await readBranchCommitId(repo, "main");

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            const targetAfter = await readBranchCommitId(repo, "main");
            assert.equal(targetAfter, body.mergeCommitId);
            assert.notEqual(targetAfter, targetBefore);
        });
    });

    describe("conflicting merge is rejected", () => {
        it("returns 409 when branches have conflicting changes", async () => {
            const repo = await createRepo("merge-conflict");
            await writeRepoFile(repo, "a.txt", "line 1\nline 2\n");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "a.txt", "line 1\nfeature change\n");
            await commitAll(repo, "feature modify", ownerToken);

            await switchToMain(repo);

            await writeRepoFile(repo, "a.txt", "line 1\nmain change\n");
            await commitAll(repo, "main modify", ownerToken);

            const mainBefore = await readBranchCommitId(repo, "main");
            const featureBefore = await readBranchCommitId(repo, "feature");

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 409);
            assert.equal(body.status, "conflicts");
            assert.ok(body.conflicts.length > 0);
            assert.ok(
                body.conflicts.some((c) => c.path === "a.txt")
            );

            const mainAfter = await readBranchCommitId(repo, "main");
            const featureAfter = await readBranchCommitId(repo, "feature");
            assert.equal(mainAfter, mainBefore);
            assert.equal(featureAfter, featureBefore);
        });

        it("does not modify either branch when merge is rejected", async () => {
            const repo = await createRepo("merge-conflict-safe");
            await writeRepoFile(repo, "a.txt", "shared content\n");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "a.txt", "feature version\n");
            await commitAll(repo, "feature version", ownerToken);

            await switchToMain(repo);

            await writeRepoFile(repo, "a.txt", "main version\n");
            await commitAll(repo, "main version", ownerToken);

            const mainBefore = await readBranchCommitId(repo, "main");
            const featureBefore = await readBranchCommitId(repo, "feature");

            await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );

            const mainAfter = await readBranchCommitId(repo, "main");
            const featureAfter = await readBranchCommitId(repo, "feature");
            assert.equal(mainAfter, mainBefore);
            assert.equal(featureAfter, featureBefore);
        });
    });

    describe("error cases", () => {
        it("returns 404 for nonexistent repository", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await jsonRequest(
                `/api/repositories/${fakeId}/merge` +
                    `?source=main&target=feature`,
                "POST",
                null,
                ownerToken
            );
            assert.equal(res.status, 404);
        });

        it("returns 400 when source branch does not exist", async () => {
            const repo = await createRepo("merge-missing-source");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "initial", ownerToken);

            const res = await jsonRequest(
                mergeUrl(repo, "nonexistent", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 400);
            assert.ok(body.message.includes("nonexistent"));
        });

        it("returns 400 when target branch does not exist", async () => {
            const repo = await createRepo("merge-missing-target");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "initial", ownerToken);

            const res = await jsonRequest(
                mergeUrl(repo, "main", "nonexistent"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 400);
            assert.ok(body.message.includes("nonexistent"));
        });

        it("returns 400 when source and target are the same", async () => {
            const repo = await createRepo("merge-same-branch");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "initial", ownerToken);

            const res = await jsonRequest(
                mergeUrl(repo, "main", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 400);
            assert.ok(body.message.includes("different"));
        });

        it("returns 400 when source branch is missing", async () => {
            const repo = await createRepo("merge-no-source");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "initial", ownerToken);

            const res = await jsonRequest(
                `/api/repositories/${repo._id}/merge?target=main`,
                "POST",
                null,
                ownerToken
            );
            assert.equal(res.status, 400);
        });

        it("returns 400 when target branch is missing", async () => {
            const repo = await createRepo("merge-no-target");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "initial", ownerToken);

            const res = await jsonRequest(
                `/api/repositories/${repo._id}/merge?source=main`,
                "POST",
                null,
                ownerToken
            );
            assert.equal(res.status, 400);
        });

        it("returns 401 without authentication", async () => {
            const repo = await createRepo("merge-no-auth");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "initial", ownerToken);

            const res = await request(
                mergeUrl(repo, "feature", "main"),
                { method: "POST", headers: { "Content-Type": "application/json" } }
            );
            assert.equal(res.status, 401);
        });

        it("returns 403 for non-owner on private repo", async () => {
            const other = await User.create({
                userName: "otheruser",
                email: "other@test.com",
                password: await bcrypt.hash("password123", 10)
            });
            const otherToken = tokenFor(other._id);

            const repo = await createRepo("merge-private", "private");
            await writeRepoFile(repo, "a.txt", "content");
            await commitAll(repo, "initial", ownerToken);

            const res = await jsonRequest(
                mergeUrl(repo, "main", "main"),
                "POST",
                null,
                otherToken
            );
            assert.equal(res.status, 403);
        });
    });

    describe("response structure", () => {
        it("returns all expected fields for fast-forward", async () => {
            const repo = await createRepo("merge-struct-ff");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "new");
            await commitAll(repo, "add", ownerToken);

            await switchToMain(repo);

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(typeof body.status, "string");
            assert.equal(typeof body.sourceBranch, "string");
            assert.equal(typeof body.targetBranch, "string");
            assert.equal(typeof body.sourceCommitId, "string");
            assert.equal(typeof body.targetCommitId, "string");
            assert.equal(typeof body.previousTargetCommitId, "string");
            assert.equal(typeof body.baseCommitId, "string");
            assert.equal(body.status, "fast_forward");
        });

        it("returns all expected fields for merge commit", async () => {
            const repo = await createRepo("merge-struct-mc");
            await writeRepoFile(repo, "a.txt", "initial");
            await commitAll(repo, "initial", ownerToken);

            await setupFeatureBranch(repo, "feature", ownerToken);

            await writeRepoFile(repo, "b.txt", "feature");
            await commitAll(repo, "feature work", ownerToken);

            await switchToMain(repo);

            await writeRepoFile(repo, "c.txt", "main");
            await commitAll(repo, "main work", ownerToken);

            const res = await jsonRequest(
                mergeUrl(repo, "feature", "main"),
                "POST",
                null,
                ownerToken
            );
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(typeof body.status, "string");
            assert.equal(typeof body.sourceBranch, "string");
            assert.equal(typeof body.targetBranch, "string");
            assert.equal(typeof body.sourceCommitId, "string");
            assert.equal(typeof body.targetCommitId, "string");
            assert.equal(typeof body.mergeCommitId, "string");
            assert.equal(body.status, "merge_commit");
        });
    });
});
