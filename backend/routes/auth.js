import express from "express";
import { signup, login } from "../controllers/authController.js";
import protect from "../middleware/authmiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// GET /api/auth/me — verify token and return current user
router.get("/me", protect, (req, res) => {
    res.json({
        user: {
            _id: req.user._id,
            userName: req.user.userName,
            email: req.user.email
        }
    });
});

export default router;
