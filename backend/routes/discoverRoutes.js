import express from "express";
import protect from "../middleware/authmiddleware.js";
import { getDiscover } from "../controllers/discoverController.js";

const router = express.Router();

router.get("/", protect, getDiscover);

export default router;