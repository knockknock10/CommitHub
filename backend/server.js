import express from "express";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import config from "./config/config.js";
import { requestIdMiddleware, requestLogger } from "./middleware/observability.js";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/auth.js";
import repositoryRoutes from "./routes/repositoryRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import discoverRoutes from "./routes/discoverRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import orgRepoRoutes from "./routes/orgRepoRoutes.js";
import { setupRealtime } from "./realtime/server.js";
import mongoose from "mongoose";

dotenv.config();

const app = express();

/* Observability Middleware */
app.use(requestIdMiddleware);
app.use(requestLogger);

/* Security headers */
app.use((req, res, next) => {

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'");
    next();
});

/* Rate limiting - simple in-memory implementation
   Note: This is not sufficient for multi-instance production deployment.
   For production, use Redis-based rate limiting. */
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, []);
    }

    const requests = rateLimitStore.get(ip).filter(timestamp => timestamp > windowStart);

    if (requests.length >= RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
            message: "Too many requests, please try again later"
        });
    }

    requests.push(now);
    rateLimitStore.set(ip, requests);

    // Clean up old entries periodically
    if (rateLimitStore.size > 10000) {
        for (const [key, timestamps] of rateLimitStore.entries()) {
            const recent = timestamps.filter(timestamp => timestamp > windowStart);
            if (recent.length === 0) {
                rateLimitStore.delete(key);
            } else {
                rateLimitStore.set(key, recent);
            }
        }
    }

    next();
};

/* Middleware */
app.use(express.json({ limit: "4mb" }));

/* CORS - restrict to configured origins in production */
const corsOptions = {
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
        : true, // Allow all in development if not configured
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

/* Apply rate limiting to auth endpoints */
app.use("/api/auth", rateLimiter);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/repositories", repositoryRoutes);

app.use("/api/issues", issueRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/org-repos", orgRepoRoutes);
app.use("/api/search", searchRoutes);

app.get("/", (req, res) => {
    res.send("CommitHub API running");
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = config.port;
const startServer = async () => {

    try {
        await connectDB();

        const httpServer = http.createServer(app);

        setupRealtime(httpServer);

        httpServer.listen(PORT, () => {
            console.log(
                `Server running on port ${PORT}`
            );
        });

        // Graceful Shutdown
        const shutdown = async (signal) => {
            console.log(`\n${signal} received. Starting graceful shutdown...`);

            httpServer.close(async () => {
                console.log('HTTP server closed.');
                try {
                    await mongoose.connection.close();
                    console.log('MongoDB connection closed.');
                } catch (err) {
                    console.error('Error closing MongoDB connection:', err);
                }
                process.exit(0);
            });

            // Force shutdown after 10s
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error(error);
    }
};

// Unhandled Promise Rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, we should probably shut down the process
    if (config.isProduction) {
        process.exit(1);
    }
});

// Uncaught Exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown:', error);
    // In production, we should probably shut down the process
    if (config.isProduction) {
        process.exit(1);
    }
});

startServer();

export { app };