import express from "express";
import protect from "../middleware/authmiddleware.js";
import {
    createRepository,
    deleteRepository,
    getRepositories,
    getRepositoryById,
    getRepositoryFile,
    getRepositoryTree,
    starRepository,
    unstarRepository,
    updateRepository
} from "../controllers/repoController.js";

const router = express.Router();

router.route("/")
.post(protect, createRepository)
.get(protect, getRepositories);

router.route("/:id")
.get(protect, getRepositoryById)
.patch(protect, updateRepository)
.delete(protect, deleteRepository);

router.route("/:id/tree")
.get(protect, getRepositoryTree);

router.route("/:id/file")
.get(protect, getRepositoryFile);

router.route("/:id/star")
.patch(protect, starRepository);

router.route("/:id/unstar")
.patch(protect, unstarRepository);


export default router;