import express from "express";
import protect from "../middleware/authmiddleware.js";
import { getUserProfile } from "../controllers/userController.js";

const router = express.Router();

router.get(
    "/profile/:id",
    protect,
    getUserProfile
);

export default router;