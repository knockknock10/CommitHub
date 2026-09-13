import { randomUUID } from "node:crypto";

export const requestIdMiddleware = (req, res, next) => {
    // Reuse the request ID if another service already created one, otherwise create a new ID for tracing
    const requestId = req.headers["x-request-id"];

    req.id = requestId || randomUUID();
    res.setHeader("X-Request-Id", req.id);

    next();
};

export const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;
        const log = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms [${req.id}]`;

        // Slow requests need attention even when they do not return an error
        if (duration >= 1000) {
            console.warn(`Slow request: ${log}`);
        } else if (res.statusCode >= 500) {
            console.error(log);
        } else if (res.statusCode >= 400) {
            console.warn(log);
        } else {
            console.log(log);
        }
    });

    next();
};