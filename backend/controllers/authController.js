import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

/* signup */
export const signup = async (req, res) => {
    try {
        const { userName, email, password } = req.body;

        // --- Input validation ---
        if (!userName || typeof userName !== "string" || !/^[a-z0-9_-]{3,34}$/.test(userName)) {
            return res.status(400).json({ message: "Username must be 3–34 characters (letters, numbers, -, _)" });
        }
        if (!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ message: "Enter a valid email address" });
        }
        if (!password || typeof password !== "string" || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const existingUserName = await User.findOne({ userName });
        if (existingUserName) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            userName,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            token: generateToken(user._id),
            user: {
                _id: user._id,
                userName: user.userName,
                email: user.email
            }
        });
    } catch (error) {
        console.error("[Signup error]:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* login */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // --- Input validation ---
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            return res.json({
                token: generateToken(user._id),
                user: {
                    _id: user._id,
                    userName: user.userName,
                    email: user.email
                }
            });
        }

        return res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
        console.error("[Login error]:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
