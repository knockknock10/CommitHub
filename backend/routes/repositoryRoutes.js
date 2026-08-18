import express from "express";
import protect from "../middleware/authmiddleware.js";
import {
    createRepository,
    createRepositoryDirectory,
    createRepositoryFile,
    deleteRepository,
    deleteRepositoryDirectory,
    deleteRepositoryFile,
    getRepositories,
    getRepositoryById,
    getRepositoryFile,
    getRepositoryTree,
    starRepository,
    unstarRepository,
    updateRepository,
    updateRepositoryFile
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
import {
    addPullRequestComment,
    closePullRequest,
    createPullRequest,
    getPullRequestById,
    getPullRequests,
    mergePullRequest,
    reopenPullRequest,
    submitReview,
    updatePullRequest
} from "../controllers/pullRequestController.js";
import {
    createTag,
    deleteTag,
    getTag,
    getTags
} from "../controllers/tagController.js";
import {
    createRelease,
    getReleaseById,
    getReleases,
    updateRelease
} from "../controllers/releaseController.js";
import {
    getRepositoryActivity
} from "../controllers/activityController.js";

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
.get(protect, getRepositoryFile)
.post(protect, createRepositoryFile)
.put(protect, updateRepositoryFile)
.delete(protect, deleteRepositoryFile);

router.route("/:id/directory")
.post(protect, createRepositoryDirectory)
.delete(protect, deleteRepositoryDirectory);

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

router.route("/:id/pull-requests")
.get(protect, getPullRequests)
.post(protect, createPullRequest);

router.route("/:id/pull-requests/:number")
.get(protect, getPullRequestById)
.patch(protect, updatePullRequest);

router.route("/:id/pull-requests/:number/close")
.post(protect, closePullRequest);

router.route("/:id/pull-requests/:number/reopen")
.post(protect, reopenPullRequest);

router.route("/:id/pull-requests/:number/reviews")
.post(protect, submitReview);

router.route("/:id/pull-requests/:number/comments")
.post(protect, addPullRequestComment);

router.route("/:id/pull-requests/:number/merge")
.post(protect, mergePullRequest);

router.route("/:id/tags")
.get(protect, getTags)
.post(protect, createTag);

router.route("/:id/tags/:tagName")
.get(protect, getTag)
.delete(protect, deleteTag);

router.route("/:id/releases")
.get(protect, getReleases)
.post(protect, createRelease);

router.route("/:id/releases/:releaseId")
.get(protect, getReleaseById)
.patch(protect, updateRelease);

router.route("/:id/activity")
.get(protect, getRepositoryActivity);


export default router;