import {
    getBranchCommitId,
    getCommitsBetween,
    getCommitDiff,
    ensureVersionControl
} from "./repoVersion.js";
import { getRepoRoot } from "./repoStorage.js";

export const computeCrossRepoComparison = async (
    sourceRoot,
    sourceBranch,
    targetRoot,
    targetBranch
) => {
    const sourceCommitId = await getBranchCommitId(
        sourceRoot,
        sourceBranch
    );
    const targetCommitId = await getBranchCommitId(
        targetRoot,
        targetBranch
    );

    if (!sourceCommitId || !targetCommitId) {
        return {
            sourceCommitId,
            targetCommitId,
            commonAncestor: null,
            ahead: 0,
            behind: 0,
            commitsAhead: [],
            commitsBehind: [],
            diff: []
        };
    }

    const sourceVC = await ensureVersionControl(sourceRoot);
    const targetVC = await ensureVersionControl(targetRoot);

    let commitsAhead = [];
    try {
        commitsAhead = await getCommitsBetween(
            sourceRoot,
            targetCommitId,
            sourceCommitId
        );
    } catch {
        commitsAhead = [];
    }

    let commitsBehind = [];
    try {
        commitsBehind = await getCommitsBetween(
            targetRoot,
            sourceCommitId,
            targetCommitId
        );
    } catch {
        commitsBehind = [];
    }

    let diff = [];
    try {
        diff = await getCommitDiff(
            sourceRoot,
            targetCommitId,
            sourceCommitId
        );
    } catch {
        diff = [];
    }

    return {
        sourceCommitId,
        targetCommitId,
        commonAncestor: null,
        ahead: commitsAhead.length,
        behind: commitsBehind.length,
        commitsAhead,
        commitsBehind,
        diff
    };
};
