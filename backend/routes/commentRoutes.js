import express from "express";
import protect from "../middleware/authmiddleware.js";

import {
    createComment,
    getIssueComments,
    deleteComment
} from "../controllers/commentController.js";

const router = express.Router();

router.route("/:issueId")
.post(
    protect,
    createComment
)
.get(
    protect,
    getIssueComments
);

router.route("/delete/:commentId")
.delete(
    protect,
    deleteComment
);

export default router;