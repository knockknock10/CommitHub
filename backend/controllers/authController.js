import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

/* signup */
export const signup = async (req, res) => {
    try {
        const { userName, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
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
        res.status(500).json({
            message: error.message
        });
    }
};

/* login */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
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

        return res.status(401).json({
            message: "Invalid credentials"
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};