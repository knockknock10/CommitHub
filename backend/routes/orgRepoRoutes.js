import express from "express";
import protect from "../middleware/authmiddleware.js";
import { getOrgRepositories } from "../controllers/orgRepoController.js";

const router = express.Router();

router.get("/:orgSlug", protect, getOrgRepositories);

export default router;