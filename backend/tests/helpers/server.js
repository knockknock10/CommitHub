import express from "express";

/* Shared test-server construction. Builds the Express app from the imported
   route modules, starts it on an ephemeral port, and provides fetch-based
   request helpers so tests never need supertest. */

export const buildApp = (...mounts) => {
    const app = express();
    app.use(express.json({ limit: "4mb" }));
    for (const [basePath, router] of mounts) {
        app.use(basePath, router);
    }
    return app;
};

export const startTestServer = async (app) => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    return { server, baseUrl };
};

export const stopTestServer = async (server) => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
};

export const jsonRequest = (baseUrl, path, method, body, token) =>
    fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });

export const getRequest = (baseUrl, path, token) =>
    fetch(`${baseUrl}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
