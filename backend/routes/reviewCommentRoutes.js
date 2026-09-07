import express from "express";
import protect from "../middleware/authmiddleware.js";
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

const router = express.Router({ mergeParams: true });

router.route("/")
    .get(protect, getReviewComments)
    .post(protect, createReviewComment);

router.route("/:commentId")
    .get(protect, getReviewCommentThread)
    .patch(protect, editReviewComment)
    .delete(protect, deleteReviewComment);

router.route("/:commentId/reply")
    .post(protect, replyToReviewComment);

router.route("/:commentId/resolve")
    .post(protect, resolveThread);

router.route("/:commentId/unresolve")
    .post(protect, unresolveThread);

export default router;
