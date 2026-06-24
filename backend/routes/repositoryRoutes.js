import express from "express";
import protect from "../middleware/authmiddleware.js";
import {
    createRepository,
    getRepositories,
    getRepositoryById,
    starRepository,
    unstarRepository
} from "../controllers/repoController.js";

const router = express.Router();

router.route("/")
.post(protect, createRepository)
.get(protect, getRepositories);

router.route("/:id")
.get(protect, getRepositoryById);

router.route("/:id/star")
.patch(protect, starRepository);

router.route("/:id/unstar")
.patch(protect, unstarRepository);


export default router;