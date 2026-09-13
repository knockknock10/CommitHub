import express from "express";
import protect from "../middleware/authmiddleware.js";
import {
    getTeams,
    createTeam,
    addTeamMember,
    removeTeamMember
} from "../controllers/teamController.js";

const router = express.Router();

router.get("/:orgSlug", protect, getTeams);
router.post("/", protect, createTeam);
router.post("/members", protect, addTeamMember);
router.delete("/members", protect, removeTeamMember);

export default router;