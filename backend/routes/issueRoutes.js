import express from "express";
import protect from "../middleware/authmiddleware.js"
import{createIssue,getRepositoryIssues,getIssueById,closeIssue,reopenIssue} from "../controllers/issueController.js"

const router = express.Router();

router.route("/repository/:id")
.post(protect,createIssue)
.get(protect,getRepositoryIssues)

router.route("/:id")
.get(protect,getIssueById)

router.route("/:id/close")
.patch(protect,closeIssue)

router.route("/:id/reopen")
.patch(protect,reopenIssue)

export default router;
