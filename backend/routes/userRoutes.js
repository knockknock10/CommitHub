import express from "express";
import protect from "../middleware/authmiddleware.js";
import { getUserProfile, updateUserProfile } from "../controllers/userController.js";

const router = express.Router();

router.get(
    "/profile/:id",
    protect,
    getUserProfile
);

router.patch(
    "/me",
    protect,
    updateUserProfile
);

export default router;
