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
import Tag from "../models/tagModel.js";
import Release from "../models/releaseModel.js";
import repositoryRoutes from "../routes/repositoryRoutes.js";
import { getRepoRoot } from "../utils/repoStorage.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-release-tag-test-")
);

process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace(
        "/commithub?",
        "/commithub_release_test?"
    );

const app = express();

app.use(express.json({ limit: "4mb" }));
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

const createCommitRequest = (repository, message, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/commits`,
        "POST",
        { message },
        token
    );

const makeCommit = async (repository, message, fileName) => {
    await writeRepoFile(repository, fileName, `${fileName} content`);
    const response = await createCommitRequest(
        repository,
        message,
        ownerToken
    );
    assert.equal(response.status, 201);
    const body = await response.json();
    return body.id;
};

const createTagRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/tags`,
        "POST",
        body,
        token
    );

const getTagsRequest = (repository, query, token) =>
    getRequest(
        `/api/repositories/${repository._id}/tags${
            query ? `?${query}` : ""
        }`,
        token
    );

const getTagRequest = (repository, tagName, token) =>
    getRequest(
        `/api/repositories/${repository._id}/tags/${tagName}`,
        token
    );

const deleteTagRequest = (repository, tagName, token) =>
    request(
        `/api/repositories/${repository._id}/tags/${tagName}`,
        {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
    );

const createReleaseRequest = (repository, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/releases`,
        "POST",
        body,
        token
    );

const getReleasesRequest = (repository, query, token) =>
    getRequest(
        `/api/repositories/${repository._id}/releases${
            query ? `?${query}` : ""
        }`,
        token
    );

const getReleaseRequest = (repository, releaseId, token) =>
    getRequest(
        `/api/repositories/${repository._id}/releases/${releaseId}`,
        token
    );

const updateReleaseRequest = (repository, releaseId, body, token) =>
    jsonRequest(
        `/api/repositories/${repository._id}/releases/${releaseId}`,
        "PATCH",
        body,
        token
    );

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
        Tag.deleteMany({}),
        Release.deleteMany({})
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
        Repository.deleteMany({}),
        Tag.deleteMany({}),
        Release.deleteMany({})
    ]);

    await fs.promises.rm(storageRoot, { recursive: true, force: true });

    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("tags: creation", () => {
    it("creates a tag pointing at a specific commit", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(
            repo,
            "initial commit",
            "a.txt"
        );

        const response = await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();
        assert.equal(body.name, "v1.0.0");
        assert.equal(body.commitId, commitId);
        assert.equal(body.commit.id, commitId);
        assert.equal(body.creator.userName, "owneruser");
        assert.ok(body.createdAt);

        const refContent = await fs.promises.readFile(
            path.join(
                repoRoot(repo),
                ".CommitHub",
                "refs",
                "tags",
                "v1.0.0"
            ),
            "utf-8"
        );
        assert.equal(refContent.trim(), commitId);

        const tag = await Tag.findOne({
            repository: repo._id,
            name: "v1.0.0"
        });
        assert.equal(tag.commitId, commitId);
    });

    it("resolves the current branch HEAD when no commitId is provided", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");

        const response = await createTagRequest(
            repo,
            { name: "latest" },
            ownerToken
        );

        assert.equal(response.status, 201);
        assert.equal((await response.json()).commitId, commitId);
    });

    it("rejects invalid and empty tag names", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");

        for (const name of ["../evil", "", "a/b", "a.lock", "a..b"]) {
            const response = await createTagRequest(
                repo,
                { name, commitId },
                ownerToken
            );
            assert.equal(response.status, 400, `name: ${name}`);
        }

        const tags = await Tag.find({ repository: repo._id });
        assert.equal(tags.length, 0);
    });

    it("rejects a duplicate tag without moving the reference", async () => {
        const repo = await createRepo("myrepo");
        const first = await makeCommit(repo, "first", "a.txt");
        const second = await makeCommit(repo, "second", "b.txt");

        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId: first },
            ownerToken
        );

        const duplicate = await createTagRequest(
            repo,
            { name: "v1.0.0", commitId: second },
            ownerToken
        );

        assert.equal(duplicate.status, 400);

        const refContent = await fs.promises.readFile(
            path.join(
                repoRoot(repo),
                ".CommitHub",
                "refs",
                "tags",
                "v1.0.0"
            ),
            "utf-8"
        );
        assert.equal(refContent.trim(), first);

        const tag = await Tag.findOne({
            repository: repo._id,
            name: "v1.0.0"
        });
        assert.equal(tag.commitId, first);
    });

    it("returns 404 when the commit does not exist", async () => {
        const repo = await createRepo("myrepo");
        await makeCommit(repo, "first", "a.txt");

        const response = await createTagRequest(
            repo,
            {
                name: "v1.0.0",
                commitId: "aa".repeat(20)
            },
            ownerToken
        );

        assert.equal(response.status, 404);
        assert.equal(
            (await response.json()).message,
            "Commit not found"
        );
    });

    it("returns 400 for an invalid commit ID", async () => {
        const repo = await createRepo("myrepo");
        await makeCommit(repo, "first", "a.txt");

        const response = await createTagRequest(
            repo,
            { name: "v1.0.0", commitId: "not-a-commit" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });
});

describe("tags: listing and retrieval", () => {
    it("lists tags sorted by name with creator metadata and pagination", async () => {
        const repo = await createRepo("myrepo");
        const first = await makeCommit(repo, "first", "a.txt");

        for (const name of ["v2.0.0", "v1.0.0", "v1.1.0"]) {
            const response = await createTagRequest(
                repo,
                { name, commitId: first },
                ownerToken
            );
            assert.equal(response.status, 201);
        }

        const pageOne = await getTagsRequest(
            repo,
            "limit=2&page=1",
            ownerToken
        );
        assert.equal(pageOne.status, 200);

        const firstPage = await pageOne.json();
        assert.deepEqual(
            firstPage.tags.map((tag) => tag.name),
            ["v1.0.0", "v1.1.0"]
        );
        assert.equal(firstPage.total, 3);
        assert.equal(firstPage.pages, 2);
        assert.equal(firstPage.tags[0].creator.userName, "owneruser");
        assert.equal(firstPage.tags[0].commitId, first);
        assert.ok(firstPage.tags[0].createdAt);

        const pageTwo = await getTagsRequest(
            repo,
            "limit=2&page=2",
            ownerToken
        );
        const secondPage = await pageTwo.json();
        assert.deepEqual(
            secondPage.tags.map((tag) => tag.name),
            ["v2.0.0"]
        );
    });

    it("gets a tag with commit metadata", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "release commit", "a.txt");

        const created = await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );
        assert.equal(created.status, 201);

        const response = await getTagRequest(repo, "v1.0.0", ownerToken);
        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.name, "v1.0.0");
        assert.equal(body.commitId, commitId);
        assert.equal(body.commit.id, commitId);
        assert.equal(body.commit.message, "release commit");
        assert.ok(body.commit.timestamp);
    });

    it("returns 404 for a missing tag", async () => {
        const repo = await createRepo("myrepo");
        await makeCommit(repo, "first", "a.txt");

        const response = await getTagRequest(repo, "nope", ownerToken);
        assert.equal(response.status, 404);
    });
});

describe("tags: deletion and integrity", () => {
    it("deletes a tag and preserves the commit", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");

        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const response = await deleteTagRequest(repo, "v1.0.0", ownerToken);
        assert.equal(response.status, 200);

        const afterGet = await getTagRequest(repo, "v1.0.0", ownerToken);
        assert.equal(afterGet.status, 404);

        const tag = await Tag.findOne({
            repository: repo._id,
            name: "v1.0.0"
        });
        assert.equal(tag, null);

        await assert.rejects(
            fs.promises.access(
                path.join(
                    repoRoot(repo),
                    ".CommitHub",
                    "refs",
                    "tags",
                    "v1.0.0"
                )
            )
        );

        const commit = await getRequest(
            `/api/repositories/${repo._id}/commits/${commitId}`,
            ownerToken
        );
        assert.equal(commit.status, 200);
    });

    it("returns 404 when deleting a missing tag", async () => {
        const repo = await createRepo("myrepo");
        await makeCommit(repo, "first", "a.txt");

        const response = await deleteTagRequest(repo, "nope", ownerToken);
        assert.equal(response.status, 404);
    });

    it("blocks deleting a tag referenced by a release", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");

        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );
        const release = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        assert.equal(release.status, 201);

        const response = await deleteTagRequest(repo, "v1.0.0", ownerToken);
        assert.equal(response.status, 400);
        assert.match(
            (await response.json()).message,
            /referenced by a release/
        );

        const stillThere = await getTagRequest(repo, "v1.0.0", ownerToken);
        assert.equal(stillThere.status, 200);
    });

    it("enforces authorization and repository isolation", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");

        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const otherCreate = await createTagRequest(
            repo,
            { name: "v9.0.0", commitId },
            otherToken
        );
        assert.equal(otherCreate.status, 403);

        const otherDelete = await deleteTagRequest(
            repo,
            "v1.0.0",
            otherToken
        );
        assert.equal(otherDelete.status, 403);

        const otherRepo = await createRepo("otherrepo", "private");
        const privateRead = await getTagRequest(
            otherRepo,
            "v1.0.0",
            otherToken
        );
        assert.equal(privateRead.status, 403);

        const isolatedRepo = await createRepo("isolated");
        const isolatedCommit = await makeCommit(
            isolatedRepo,
            "first",
            "a.txt"
        );
        const isolated = await createTagRequest(
            isolatedRepo,
            { name: "v1.0.0", commitId: isolatedCommit },
            ownerToken
        );
        assert.equal(isolated.status, 201);

        const original = await getTagRequest(repo, "v1.0.0", ownerToken);
        const originalBody = await original.json();
        assert.equal(originalBody.commitId, commitId);
    });
});

describe("releases: creation", () => {
    it("creates a draft release from an existing tag", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const response = await createReleaseRequest(
            repo,
            {
                tagName: "v1.0.0",
                title: "First release",
                description: "Initial public release"
            },
            ownerToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();
        assert.equal(body.tagName, "v1.0.0");
        assert.equal(body.title, "First release");
        assert.equal(body.description, "Initial public release");
        assert.equal(body.status, "draft");
        assert.equal(body.publishedAt, null);
        assert.equal(body.author.userName, "owneruser");
    });

    it("requires a title", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const response = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "   " },
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.equal(
            (await response.json()).message,
            "Release title is required"
        );
    });

    it("rejects a tag that does not exist in the repository", async () => {
        const repo = await createRepo("myrepo");
        await makeCommit(repo, "first", "a.txt");

        const response = await createReleaseRequest(
            repo,
            { tagName: "nope", title: "Broken release" },
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.match(
            (await response.json()).message,
            /does not exist/
        );
    });

    it("rejects a tag owned by another repository", async () => {
        const repoA = await createRepo("repo-a");
        const commitId = await makeCommit(repoA, "first", "a.txt");
        await createTagRequest(
            repoA,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const repoB = await createRepo("repo-b");
        await makeCommit(repoB, "first", "a.txt");

        const response = await createReleaseRequest(
            repoB,
            { tagName: "v1.0.0", title: "Wrong repo release" },
            ownerToken
        );

        assert.equal(response.status, 400);
    });

    it("enforces write permission for creation", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const response = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "Nope" },
            otherToken
        );

        assert.equal(response.status, 403);
    });
});

describe("releases: listing and detail", () => {
    it("lists releases newest first with pagination and without description", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");

        for (const name of ["v1.0.0", "v2.0.0", "v3.0.0"]) {
            await createTagRequest(
                repo,
                { name, commitId },
                ownerToken
            );
        }

        await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "Release one", description: "secret notes" },
            ownerToken
        );
        await createReleaseRequest(
            repo,
            { tagName: "v2.0.0", title: "Release two", description: "more notes" },
            ownerToken
        );
        await createReleaseRequest(
            repo,
            { tagName: "v3.0.0", title: "Release three", description: "final notes" },
            ownerToken
        );

        const pageOne = await getReleasesRequest(
            repo,
            "limit=2&page=1",
            ownerToken
        );
        assert.equal(pageOne.status, 200);

        const firstPage = await pageOne.json();
        assert.deepEqual(
            firstPage.releases.map((release) => release.title),
            ["Release three", "Release two"]
        );
        assert.equal(firstPage.total, 3);
        assert.equal(firstPage.pages, 2);
        assert.equal(
            firstPage.releases[0].description,
            undefined
        );

        const pageTwo = await getReleasesRequest(
            repo,
            "limit=2&page=2",
            ownerToken
        );
        const secondPage = await pageTwo.json();
        assert.deepEqual(
            secondPage.releases.map((release) => release.title),
            ["Release one"]
        );
    });

    it("gets release detail including commit metadata", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "release commit", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const created = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release", description: "notes" },
            ownerToken
        );
        const release = await created.json();

        const response = await getReleaseRequest(
            repo,
            release._id,
            ownerToken
        );
        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.tagName, "v1.0.0");
        assert.equal(body.title, "First release");
        assert.equal(body.description, "notes");
        assert.equal(body.commitId, commitId);
        assert.equal(body.commit.id, commitId);
        assert.equal(body.commit.message, "release commit");
        assert.equal(body.tagExists, true);
        assert.deepEqual(body.changesSincePreviousTag, []);
        assert.equal(body.previousTagName, null);
    });

    it("includes changes since the previous tag", async () => {
        const repo = await createRepo("myrepo");
        const first = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v0.0.1", commitId: first },
            ownerToken
        );

        const second = await makeCommit(repo, "second", "b.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId: second },
            ownerToken
        );

        const created = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        const release = await created.json();

        const response = await getReleaseRequest(
            repo,
            release._id,
            ownerToken
        );
        const body = await response.json();

        assert.equal(body.previousTagName, "v0.0.1");
        assert.deepEqual(
            body.changesSincePreviousTag.map((commit) => commit.id),
            [second]
        );
    });

    it("verifies the release -> tag -> commit relationship", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "tagged work", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const created = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        const release = await created.json();

        const detail = await getReleaseRequest(
            repo,
            release._id,
            ownerToken
        );
        const detailBody = await detail.json();

        assert.equal(detailBody.commitId, commitId);

        const tag = await Tag.findOne({
            repository: repo._id,
            name: "v1.0.0"
        });
        assert.equal(tag.commitId, commitId);

        const commitResponse = await getRequest(
            `/api/repositories/${repo._id}/commits/${commitId}`,
            ownerToken
        );
        assert.equal(commitResponse.status, 200);
        assert.equal((await commitResponse.json()).id, commitId);
    });

    it("returns 404 for a release outside the repository", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const created = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        const release = await created.json();

        const otherRepo = await createRepo("otherrepo");
        const response = await getReleaseRequest(
            otherRepo,
            release._id,
            ownerToken
        );
        assert.equal(response.status, 404);
    });
});

describe("releases: editing and publishing", () => {
    it("edits a draft release title, notes, and tag", async () => {
        const repo = await createRepo("myrepo");
        const first = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId: first },
            ownerToken
        );
        const second = await makeCommit(repo, "second", "b.txt");
        await createTagRequest(
            repo,
            { name: "v1.1.0", commitId: second },
            ownerToken
        );

        const created = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "Draft title" },
            ownerToken
        );
        const release = await created.json();

        const response = await updateReleaseRequest(
            repo,
            release._id,
            {
                title: "Renamed",
                description: "Updated notes",
                tagName: "v1.1.0"
            },
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.title, "Renamed");
        assert.equal(body.description, "Updated notes");
        assert.equal(body.tagName, "v1.1.0");
        assert.equal(body.status, "draft");
    });

    it("publishes a draft release and sets publishedAt", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const created = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        const release = await created.json();

        const response = await updateReleaseRequest(
            repo,
            release._id,
            { status: "published" },
            ownerToken
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.status, "published");
        assert.ok(body.publishedAt);
    });

    it("keeps publishedAt on a repeat publish and rejects reverting to draft", async () => {
        const repo = await createRepo("myrepo");
        const commitId = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const created = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        const release = await created.json();

        await updateReleaseRequest(
            repo,
            release._id,
            { status: "published" },
            ownerToken
        );

        const repeat = await updateReleaseRequest(
            repo,
            release._id,
            { status: "published" },
            ownerToken
        );
        assert.equal(repeat.status, 200);
        const repeatBody = await repeat.json();
        assert.ok(repeatBody.publishedAt);

        const revert = await updateReleaseRequest(
            repo,
            release._id,
            { status: "draft" },
            ownerToken
        );
        assert.equal(revert.status, 400);

        const detail = await getReleaseRequest(
            repo,
            release._id,
            ownerToken
        );
        assert.equal((await detail.json()).status, "published");
    });

    it("freezes the tag of a published release", async () => {
        const repo = await createRepo("myrepo");
        const first = await makeCommit(repo, "first", "a.txt");
        await createTagRequest(
            repo,
            { name: "v1.0.0", commitId: first },
            ownerToken
        );
        const second = await makeCommit(repo, "second", "b.txt");
        await createTagRequest(
            repo,
            { name: "v1.1.0", commitId: second },
            ownerToken
        );

        const created = await createReleaseRequest(
            repo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        const release = await created.json();

        await updateReleaseRequest(
            repo,
            release._id,
            { status: "published" },
            ownerToken
        );

        const response = await updateReleaseRequest(
            repo,
            release._id,
            { tagName: "v1.1.0" },
            ownerToken
        );

        assert.equal(response.status, 400);
        assert.match(
            (await response.json()).message,
            /published release/
        );
    });

    it("enforces authorization and visibility for releases", async () => {
        const publicRepo = await createRepo("myrepo");
        const commitId = await makeCommit(publicRepo, "first", "a.txt");
        await createTagRequest(
            publicRepo,
            { name: "v1.0.0", commitId },
            ownerToken
        );

        const created = await createReleaseRequest(
            publicRepo,
            { tagName: "v1.0.0", title: "First release" },
            ownerToken
        );
        const release = await created.json();

        const otherRead = await getReleaseRequest(
            publicRepo,
            release._id,
            otherToken
        );
        assert.equal(otherRead.status, 200);

        const privateRepo = await createRepo("private-repo", "private");
        const privateCommit = await makeCommit(privateRepo, "first", "a.txt");
        await createTagRequest(
            privateRepo,
            { name: "v1.0.0", commitId: privateCommit },
            ownerToken
        );
        const privateCreated = await createReleaseRequest(
            privateRepo,
            { tagName: "v1.0.0", title: "Secret release" },
            ownerToken
        );
        const privateRelease = await privateCreated.json();

        const privateRead = await getReleaseRequest(
            privateRepo,
            privateRelease._id,
            otherToken
        );
        assert.equal(privateRead.status, 403);

        const privateList = await getReleasesRequest(
            privateRepo,
            "",
            otherToken
        );
        assert.equal(privateList.status, 403);

        const nonOwnerEdit = await updateReleaseRequest(
            publicRepo,
            release._id,
            { title: "Hijacked" },
            otherToken
        );
        assert.equal(nonOwnerEdit.status, 403);
    });
});
