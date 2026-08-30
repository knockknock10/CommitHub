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
    updateRepositoryFile,
    getBranchTree,
    getBranchBlob,
    getRawFile,
    getFileCommitHistory,
    createBranchFile,
    editBranchFile,
    deleteBranchFile,
    compareBranches
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
    getMergeStatus,
    getPullRequestById,
    getPullRequestReviews,
    getPullRequests,
    mergePullRequest,
    reopenPullRequest,
    submitReview,
    updatePullRequest,
    updatePullRequestReview
} from "../controllers/pullRequestController.js";
import {
    getBranchProtection,
    updateBranchProtection
} from "../controllers/branchProtectionController.js";
import { getMergeAnalysis } from "../controllers/mergeAnalysisController.js";
import { executeMerge } from "../controllers/mergeBranchController.js";
import {
    getConflictDetail,
    resolveConflicts
} from "../controllers/conflictResolutionController.js";
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
    createReviewComment,
    getReviewComments,
    getReviewCommentThread,
    replyToReviewComment,
    resolveThread,
    unresolveThread,
    editReviewComment,
    deleteReviewComment
} from "../controllers/reviewCommentController.js";
import {
    getRepositoryActivity
} from "../controllers/activityController.js";
import {
    getCollaborators,
    addCollaborator,
    updateCollaborator,
    removeCollaborator,
    getMyCollaboratorRole
} from "../controllers/collaboratorController.js";
import {
    forkRepository,
    getRepositoryForks
} from "../controllers/forkController.js";

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

router.route("/:id/branch-tree")
.get(protect, getBranchTree);

router.route("/:id/branch-blob")
.get(protect, getBranchBlob);

router.route("/:id/raw")
.get(protect, getRawFile);

router.route("/:id/file-history")
.get(protect, getFileCommitHistory);

router.route("/:id/branch-file/create")
.post(protect, createBranchFile);

router.route("/:id/branch-file/edit")
.put(protect, editBranchFile);

router.route("/:id/branch-file/remove")
.delete(protect, deleteBranchFile);

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

router.route("/:id/compare")
.get(protect, compareBranches);

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
.get(protect, getPullRequestReviews)
.post(protect, submitReview);

router.route("/:id/pull-requests/:number/reviews/:reviewId")
.patch(protect, updatePullRequestReview);

router.route("/:id/pull-requests/:number/comments")
.post(protect, addPullRequestComment);

router.route("/:id/pull-requests/:number/review-comments")
.get(protect, getReviewComments)
.post(protect, createReviewComment);

router.route("/:id/pull-requests/:number/review-comments/:commentId")
.get(protect, getReviewCommentThread)
.patch(protect, editReviewComment)
.delete(protect, deleteReviewComment);

router.route("/:id/pull-requests/:number/review-comments/:commentId/reply")
.post(protect, replyToReviewComment);

router.route("/:id/pull-requests/:number/review-comments/:commentId/resolve")
.post(protect, resolveThread);

router.route("/:id/pull-requests/:number/review-comments/:commentId/unresolve")
.post(protect, unresolveThread);

router.route("/:id/pull-requests/:number/merge")
.post(protect, mergePullRequest);

router.route("/:id/pull-requests/:number/merge-status")
.get(protect, getMergeStatus);

router.route("/:id/pull-requests/:number/conflicts")
.get(protect, getConflictDetail);

router.route("/:id/pull-requests/:number/conflicts/resolve")
.post(protect, resolveConflicts);

router.route("/:id/merge-analysis")
.get(protect, getMergeAnalysis);

router.route("/:id/branch-protection/:branch")
.get(protect, getBranchProtection)
.put(protect, updateBranchProtection);

router.route("/:id/merge")
.post(protect, executeMerge);

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

router.route("/:id/collaborators")
.get(protect, getCollaborators)
.post(protect, addCollaborator);

router.route("/:id/collaborators/me")
.get(protect, getMyCollaboratorRole);

router.route("/:id/collaborators/:userId")
.patch(protect, updateCollaborator)
.delete(protect, removeCollaborator);

router.route("/:id/fork")
.post(protect, forkRepository);

router.route("/:id/forks")
.get(protect, getRepositoryForks);


export default router;