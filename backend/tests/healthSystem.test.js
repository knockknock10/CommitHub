import {
    after,
    before,
    describe,
    it
} from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const mongoUri =
    process.env.MONGO_URI_TEST ||
    process.env.MONGO_URI.replace("/commithub?", "/commithub_health_test?");

const app = express();
app.get("/", (req, res) => {
    res.send("CommitHub API running");
});

let server;
let baseUrl;

before(async () => {
    await mongoose.connect(mongoUri);
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
});

describe("Health check", () => {
    it("responds 200 on the root endpoint", async () => {
        const response = await fetch(`${baseUrl}/`);
        assert.equal(response.status, 200);
    });

    it("returns a running message", async () => {
        const response = await fetch(`${baseUrl}/`);
        const text = await response.text();
        assert.match(text, /CommitHub API running/i);
    });
});
