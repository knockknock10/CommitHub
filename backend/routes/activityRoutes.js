import express from "express";
import protect from "../middleware/authmiddleware.js";
import {
    getGlobalActivity
} from "../controllers/activityController.js";

const router = express.Router();

router.get("/", protect, getGlobalActivity);

export default router;
