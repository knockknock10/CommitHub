import express from "express";
import protect from "../middleware/authmiddleware.js";
import {
    createOrganization,
    getOrganization,
    getOrganizationMembers,
    addOrganizationMember,
    removeOrganizationMember
} from "../controllers/organizationController.js";

const router = express.Router();

router.post("/", protect, createOrganization);
router.get("/:slug", protect, getOrganization);
router.get("/:slug/members", protect, getOrganizationMembers);
router.post("/:slug/members", protect, addOrganizationMember);
router.delete("/:slug/members/:userId", protect, removeOrganizationMember);

export default router;