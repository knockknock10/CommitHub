import express from "express";
import protect from "../middleware/authmiddleware.js";
import {
    createRepository,
    getRepositories
} from "../controllers/repoController.js";

const router = express.Router();

router.route("/").post(protect, createRepository).get(protect, getRepositories);

export default router;