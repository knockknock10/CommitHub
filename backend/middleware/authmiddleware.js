import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const protect = async (req, res, next) => {
    const authorization = req.headers.authorization;
    // Stop the request early when there is no JWT to verify
    if (!authorization) {
        return res.status(401).json({
            message: "No token provided"
        });
    }
    // Only accept the standard "Bearer <token>" authorization format
    const [scheme, token] = authorization.trim().split(/\s+/);
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Not authorized"
        });
    }
    try {
        // Verify the token signature and expiration before trusting its user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id) {
            return res.status(401).json({
                message: "Not authorized"
            });
        }
        // Fetch the user again so deleted users cannot access the system with an old token
        // Password is excluded because it should never be available through req.user
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({
                message: "User no longer exists"
            });
        }
        // Make the authenticated user available to controllers and other middleware
        req.user = user;
        return next();
    } catch (error) {
        // Keep JWT failure details hidden so we do not reveal authentication information
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "Not authorized"
            });
        }
        // Database and unexpected errors wll reach the global error handler
        return next(error);
    }
};
export default protect;