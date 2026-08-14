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
import {
    createCommit,
    getCommit,
    getCommitHistory,
    getWorkingTreeChanges
} from "../controllers/commitController.js";
import {
    checkoutBranch,
    createBranch,
    listBranches
} from "../controllers/branchController.js";

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

router.route("/:id/commits")
.get(protect, getCommitHistory)
.post(protect, createCommit);

router.route("/:id/commits/:commitId")
.get(protect, getCommit);

router.route("/:id/changes")
.get(protect, getWorkingTreeChanges);

router.route("/:id/branches")
.get(protect, listBranches)
.post(protect, createBranch);

router.route("/:id/branches/checkout")
.post(protect, checkoutBranch);


export default router;