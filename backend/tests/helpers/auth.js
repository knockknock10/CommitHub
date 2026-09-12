import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* Shared authentication helpers for HTTP integration tests. Matches the
   backend's protect middleware, which verifies a Bearer JWT signed with the
   user id under process.env.JWT_SECRET. */

export const tokenFor = (userId) =>
    jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, {
        expiresIn: "1h"
    });

export const expiredTokenFor = (userId) =>
    jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, {
        expiresIn: -10
    });

export const invalidToken = "not-a-valid-jwt";

export const malformedToken = (userId) =>
    jwt.sign({ id: userId.toString() }, "a-different-secret", {
        expiresIn: "1h"
    });

export const createUser = async (User, userName, email) =>
    User.create({
        userName,
        email,
        password: await bcrypt.hash("password123", 10)
    });
