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
import Organization from "../models/organizationModel.js";
import OrganizationMembership from "../models/organizationMembershipModel.js";
import organizationRoutes from "../routes/organizationRoutes.js";
import teamRoutes from "../routes/teamRoutes.js";
import { tokenFor, createUser } from "./helpers/auth.js";

dotenv.config();

const storageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "commithub-org-test-")
);
process.env.REPO_STORAGE_ROOT = storageRoot;

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_org_test?");

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use("/api/organizations", organizationRoutes);
app.use("/api/teams", teamRoutes);

let server;
let baseUrl;

const getRequest = (path, token) =>
    fetch(`${baseUrl}${path}`, {
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
    await Organization.deleteMany({});
    await OrganizationMembership.deleteMany({});
    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    await fs.promises.mkdir(storageRoot, { recursive: true });
});

after(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    await OrganizationMembership.deleteMany({});
    await fs.promises.rm(storageRoot, { recursive: true, force: true });
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
});

describe("Organization access control", () => {
    it("allows anyone to view a public organization profile", async () => {
        const owner = await createUser(User, "orgboss", "orgboss@test.com");
        const stranger = await createUser(User, "stranger", "stranger@test.com");

        await Organization.create({
            name: "Acme",
            slug: "acme",
            visibility: "public",
            owner: owner._id
        });

        const response = await getRequest(
            "/api/organizations/acme",
            tokenFor(stranger._id)
        );

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.slug, "acme");
    });

    it("blocks non-members from viewing a private organization profile", async () => {
        const owner = await createUser(User, "orgboss", "orgboss@test.com");
        const stranger = await createUser(User, "stranger", "stranger@test.com");

        await Organization.create({
            name: "SecretOrg",
            slug: "secretorg",
            visibility: "private",
            owner: owner._id
        });

        const response = await getRequest(
            "/api/organizations/secretorg",
            tokenFor(stranger._id)
        );

        assert.equal(response.status, 403);
    });

    it("allows members to view a private organization profile", async () => {
        const owner = await createUser(User, "orgboss", "orgboss@test.com");
        const member = await createUser(User, "member", "member@test.com");

        const organization = await Organization.create({
            name: "SecretOrg",
            slug: "secretorg",
            visibility: "private",
            owner: owner._id
        });

        await OrganizationMembership.create({
            organization: organization._id,
            user: member._id,
            role: "MEMBER"
        });

        const response = await getRequest(
            "/api/organizations/secretorg",
            tokenFor(member._id)
        );

        assert.equal(response.status, 200);
    });

    it("restricts the member roster to organization members", async () => {
        const owner = await createUser(User, "orgboss", "orgboss@test.com");
        const stranger = await createUser(User, "stranger", "stranger@test.com");

        const organization = await Organization.create({
            name: "Acme",
            slug: "acme",
            visibility: "public",
            owner: owner._id
        });

        await OrganizationMembership.create({
            organization: organization._id,
            user: owner._id,
            role: "OWNER"
        });

        const nonMember = await getRequest(
            "/api/organizations/acme/members",
            tokenFor(stranger._id)
        );
        assert.equal(nonMember.status, 403);

        const memberView = await getRequest(
            "/api/organizations/acme/members",
            tokenFor(owner._id)
        );
        assert.equal(memberView.status, 200);
        const body = await memberView.json();
        assert.ok(body.some((m) => m.user.userName === "orgboss"));
    });

    it("restricts the org teams list to organization members", async () => {
        const owner = await createUser(User, "orgboss", "orgboss@test.com");
        const stranger = await createUser(User, "stranger", "stranger@test.com");

        const organization = await Organization.create({
            name: "Acme",
            slug: "acme",
            visibility: "public",
            owner: owner._id
        });

        await OrganizationMembership.create({
            organization: organization._id,
            user: owner._id,
            role: "OWNER"
        });

        const nonMember = await getRequest(
            "/api/teams/acme",
            tokenFor(stranger._id)
        );
        assert.equal(nonMember.status, 403);

        const memberView = await getRequest(
            "/api/teams/acme",
            tokenFor(owner._id)
        );
        assert.equal(memberView.status, 200);
    });
});