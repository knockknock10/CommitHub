class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        // Store HTTP status so the global handler knows what response to send
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        // Used to separate expected application errors from unexpected server errors
        this.isOperational = true;
        // Keeps the stack trace pointing to where the AppError was created
        Error.captureStackTrace(this, this.constructor);
    }
}

const handleValidationError = (error) => {
    // Mongoose validation errors contain multiple field errors, so combine them into one message
    const message = Object.values(error.errors)
        .map((item) => item.message)
        .join(", ");

    return new AppError(message || "Invalid request data", 400);
};

const handleCastError = () => {
    // Invalid MongoDB IDs should be a client error, not an internal server error
    return new AppError("Invalid resource identifier", 400);
};

const handleDuplicateKeyError = (error) => {
    // Find which unique field caused the duplicate value error
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0];

    if (field) {
        return new AppError(`A resource with this ${field} already exists`, 409);
    }

    return new AppError("A resource with the provided value already exists", 409);
};

const handleJwtError = () => {
    // Do not expose details about why the JWT failed
    return new AppError("Not authorized", 401);
};

const globalErrorHandler = (err, req, res, next) => {
    // Let Express handle the error if the response has already started
    if (res.headersSent) {
        return next(err);
    }

    let error = err;

    // Convert common errors into proper API errors
    if (err.name === "ValidationError") {
        error = handleValidationError(err);
    } else if (err.name === "CastError") {
        error = handleCastError();
    } else if (err.code === 11000) {
        error = handleDuplicateKeyError(err);
    } else if (
        err.name === "JsonWebTokenError" ||
        err.name === "TokenExpiredError" ||
        err.name === "NotBeforeError"
    ) {
        error = handleJwtError();
    }

    const statusCode = error.statusCode || 500;
    const status = error.status || "error";
    const isProduction = process.env.NODE_ENV === "production";

    if (statusCode >= 500) {
        console.error(error);
    }

    // Never expose internal error details to users in production
    if (isProduction && !error.isOperational) {
        return res.status(500).json({
            status: "error",
            message: "Internal server error"
        });
    }

    return res.status(statusCode).json({
        status,
        message: error.message || "Internal server error",
        ...(isProduction
            ? {}
            : {
                stack: error.stack
            })
    });
};
const notFoundHandler = (req, res, next) => {
    // Turn unknown routes into the same error format as other application errors
    const error = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
    next(error);
};
export { AppError, globalErrorHandler, notFoundHandler };