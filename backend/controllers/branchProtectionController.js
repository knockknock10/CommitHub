import mongoose from "mongoose";
import BranchProtection from "../models/branchProtectionModel.js";
import { authorizeRepository } from "../utils/repoAccess.js";

const REQUIRED_APPROVALS_MIN = 1;
const REQUIRED_APPROVALS_MAX = 10;

const serializeProtection = (protection) => ({
    id: protection._id,
    repository: protection.repository,
    branch: protection.branch,
    enabled: protection.enabled,
    requiredApprovals: protection.requiredApprovals,
    dismissStaleReviews: protection.dismissStaleReviews,
    createdAt: protection.createdAt,
    updatedAt: protection.updatedAt
});

const resolveBranch = (req) => {
    const branch =
        typeof req.params.branch === "string"
            ? req.params.branch.trim()
            : "";

    return branch;
};

/* get branch protection for a single branch */
export const getBranchProtection = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const branch = resolveBranch(req);

        if (branch === "") {
            return res.status(400).json({
                message: "Branch name is required"
            });
        }

        if (!result.repository.branches.includes(branch)) {
            return res.status(404).json({
                message: "Branch not found"
            });
        }

        const protection = await BranchProtection.findOne({
            repository: result.repository._id,
            branch
        });

        if (!protection) {
            /* unprotected default so settings forms can prefill */
            return res.status(200).json({
                repository: result.repository._id,
                branch,
                enabled: false,
                requiredApprovals: 1,
                dismissStaleReviews: true
            });
        }

        return res.status(200).json(
            serializeProtection(protection)
        );
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* create or update branch protection for a single branch */
export const updateBranchProtection = async (req, res) => {
    try {
        /* owner-only: changing merge requirements is a trust decision
           and must never be available to regular contributors */
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const branch = resolveBranch(req);

        if (branch === "") {
            return res.status(400).json({
                message: "Branch name is required"
            });
        }

        if (!result.repository.branches.includes(branch)) {
            return res.status(404).json({
                message: "Branch not found"
            });
        }

        const enabled =
            typeof req.body?.enabled === "boolean"
                ? req.body.enabled
                : true;

        const dismissStaleReviews =
            typeof req.body?.dismissStaleReviews === "boolean"
                ? req.body.dismissStaleReviews
                : true;

        const rawApprovals = req.body?.requiredApprovals;
        const requiredApprovals =
            typeof rawApprovals === "number"
                ? rawApprovals
                : Number.parseInt(rawApprovals, 10);

        if (
            !Number.isInteger(requiredApprovals) ||
            requiredApprovals < REQUIRED_APPROVALS_MIN ||
            requiredApprovals > REQUIRED_APPROVALS_MAX
        ) {
            return res.status(400).json({
                message: `Required approvals must be an integer between ${REQUIRED_APPROVALS_MIN} and ${REQUIRED_APPROVALS_MAX}`
            });
        }

        const protection =
            await BranchProtection.findOneAndUpdate(
                {
                    repository: result.repository._id,
                    branch
                },
                {
                    enabled,
                    requiredApprovals,
                    dismissStaleReviews
                },
                {
                    upsert: true,
                    returnDocument: "after",
                    setDefaultsOnInsert: true
                }
            );

        return res.status(200).json(
            serializeProtection(protection)
        );
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
