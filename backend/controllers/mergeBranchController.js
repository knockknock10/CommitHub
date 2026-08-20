import { authorizeRepository } from "../utils/repoAccess.js";
import { getRepoRoot } from "../utils/repoStorage.js";
import { getBranchCommitId } from "../utils/repoVersion.js";
import { performMerge } from "../utils/diffMerge.js";

export const executeMerge = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

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

        const author = {
            name: req.user.userName,
            email: req.user.email
        };

        try {
            const mergeResult = await performMerge(
                repoRoot,
                sourceBranch,
                targetBranch,
                author
            );

            if (mergeResult.merged === false) {
                return res.status(400).json({
                    message: "Already up to date",
                    status: "up_to_date",
                    sourceBranch,
                    targetBranch,
                    sourceCommitId: mergeResult.sourceCommitId,
                    targetCommitId: mergeResult.targetCommitId
                });
            }

            if (mergeResult.fastForward) {
                return res.status(200).json({
                    message: "Fast-forward merge successful",
                    status: "fast_forward",
                    sourceBranch,
                    targetBranch,
                    sourceCommitId: mergeResult.sourceCommitId,
                    targetCommitId: mergeResult.targetCommitId,
                    previousTargetCommitId: mergeResult.previousTargetCommitId,
                    baseCommitId: mergeResult.baseCommitId
                });
            }

            return res.status(200).json({
                message: "Merge successful",
                status: "merge_commit",
                sourceBranch,
                targetBranch,
                sourceCommitId: mergeResult.sourceCommitId,
                targetCommitId: mergeResult.previousTargetCommitId,
                mergeCommitId: mergeResult.mergeCommitId
            });
        } catch (error) {
            if (error.code === "BRANCH_NOT_FOUND") {
                return res.status(400).json({
                    message: error.message
                });
            }

            if (error.code === "ALREADY_UP_TO_DATE") {
                return res.status(400).json({
                    message: "Already up to date",
                    status: "up_to_date"
                });
            }

            if (error.code === "CONFLICTS_DETECTED") {
                return res.status(409).json({
                    message: error.message,
                    status: "conflicts",
                    conflicts: error.conflicts
                });
            }

            if (error.code === "DIRTY_TREE") {
                return res.status(400).json({
                    message: error.message
                });
            }

            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
