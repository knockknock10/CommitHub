import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

router.get("/ready", (req, res) => {
    const dbState = mongoose.connection.readyState;
    const ready = dbState === 1;

    res.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "not ready",
        database: ready ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
    });
});

export default router;
