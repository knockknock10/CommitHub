import { authorizeRepository } from "../utils/repoAccess.js";
import { getRepoRoot } from "../utils/repoStorage.js";
import { getBranchCommitId } from "../utils/repoVersion.js";
import { computeMergeAnalysis } from "../utils/diffMerge.js";

/* analyze whether sourceBranch can be merged into targetBranch and return
   per-file conflicts without mutating repository state. */
export const getMergeAnalysis = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const sourceBranch =
            typeof req.query.source === "string"
                ? req.query.source.trim()
                : "";
        const targetBranch =
            typeof req.query.target === "string"
                ? req.query.target.trim()
                : "";

        if (sourceBranch === "" || targetBranch === "") {
            return res.status(400).json({
                message: "Source and target branches are required"
            });
        }

        if (sourceBranch === targetBranch) {
            return res.status(400).json({
                message: "Source and target branches must be different"
            });
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        try {
            const sourceCommitId = await getBranchCommitId(
                repoRoot,
                sourceBranch
            );

            if (!sourceCommitId) {
                return res.status(400).json({
                    message: `Branch "${sourceBranch}" does not exist`
                });
            }
        } catch (error) {
            if (error.code === "INVALID_BRANCH_NAME") {
                return res.status(400).json({
                    message: "Invalid source branch name"
                });
            }

            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(400).json({
                    message: `Branch "${sourceBranch}" does not exist`
                });
            }

            throw error;
        }

        try {
            const targetCommitId = await getBranchCommitId(
                repoRoot,
                targetBranch
            );

            if (!targetCommitId) {
                return res.status(400).json({
                    message: `Branch "${targetBranch}" does not exist`
                });
            }
        } catch (error) {
            if (error.code === "INVALID_BRANCH_NAME") {
                return res.status(400).json({
                    message: "Invalid target branch name"
                });
            }

            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(400).json({
                    message: `Branch "${targetBranch}" does not exist`
                });
            }

            throw error;
        }

        const analysis = await computeMergeAnalysis(
            repoRoot,
            sourceBranch,
            targetBranch
        );

        return res.status(200).json(analysis);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
