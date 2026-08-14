import { getRepoRoot } from "../utils/repoStorage.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import {
    createBranch as performCreateBranch,
    checkoutBranch as performCheckoutBranch,
    listBranches as readBranches
} from "../utils/repoVersion.js";

/* list branches */
export const listBranches = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const state = await readBranches(repoRoot);

        return res.status(200).json(state);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* create branch */
export const createBranch = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const name =
            typeof req.body?.name === "string"
                ? req.body.name.trim()
                : "";

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const branch = await performCreateBranch(repoRoot, name);

        await result.repository.updateOne({
            $addToSet: { branches: branch.name }
        });

        return res.status(201).json(branch);
    } catch (error) {
        if (error.code === "INVALID_BRANCH_NAME") {
            return res.status(400).json({
                message: "Invalid branch name"
            });
        }

        if (error.code === "BRANCH_EXISTS") {
            return res.status(400).json({
                message: error.message
            });
        }

        if (error.code === "NO_HEAD_COMMIT") {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* switch branch */
export const checkoutBranch = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, true);

        if (!result) {
            return;
        }

        const name =
            typeof req.body?.name === "string"
                ? req.body.name.trim()
                : "";

        const force = req.body?.force === true;

        const repoRoot = getRepoRoot(
            result.repository.owner,
            result.repository._id
        );

        const branch = await performCheckoutBranch(
            repoRoot,
            name,
            { force }
        );

        return res.status(200).json(branch);
    } catch (error) {
        if (error.code === "INVALID_BRANCH_NAME") {
            return res.status(400).json({
                message: "Invalid branch name"
            });
        }

        if (error.code === "BRANCH_NOT_FOUND") {
            return res.status(404).json({
                message: error.message
            });
        }

        if (error.code === "DIRTY_TREE") {
            return res.status(400).json({
                message: error.message
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};
