import fs from "fs";
import path from "path";

import {
    ensureVersionControl,
    getBranchCommitId,
    getCommitDiff,
    getMergeBase,
    getSnapshot,
    isAncestorCommit,
    getCommit,
    createMergeCommit,
    fastForwardMerge
} from "./repoVersion.js";

const MAX_ANALYSIS_FILE_LINES = 5000;

const collectAncestorRanges = (operations) => {
    const ranges = [];
    let currentStart = null;
    let currentEnd = null;

    for (const operation of operations) {
        if (operation.type === "add") {
            continue;
        }

        const line = operation.oldLine;

        if (currentStart === null) {
            currentStart = line;
            currentEnd = line;
        } else if (line === currentEnd + 1) {
            currentEnd = line;
        } else {
            ranges.push({ start: currentStart, end: currentEnd });
            currentStart = line;
            currentEnd = line;
        }
    }

    if (currentStart !== null) {
        ranges.push({ start: currentStart, end: currentEnd });
    }

    return ranges;
};

const rangesOverlap = (a, b) =>
    a.start <= b.end && b.start <= a.end;

const collectRangeOps = (oldLines, newLines) => {
    const n = oldLines.length;
    const m = newLines.length;

    if (n === 0 && m === 0) {
        return [];
    }

    if (n === 0) {
        const ops = [];

        for (let j = 0; j < m; j += 1) {
            ops.push({
                type: "add",
                text: newLines[j],
                oldLine: 0,
                newLine: j + 1
            });
        }

        return ops;
    }

    if (m === 0) {
        const ops = [];

        for (let i = 0; i < n; i += 1) {
            ops.push({
                type: "del",
                text: oldLines[i],
                oldLine: i + 1,
                newLine: i + 1
            });
        }

        return ops;
    }

    const dp = Array.from(
        { length: n + 1 },
        () => new Array(m + 1).fill(0)
    );

    for (let i = n - 1; i >= 0; i -= 1) {
        for (let j = m - 1; j >= 0; j -= 1) {
            dp[i][j] = oldLines[i] === newLines[j]
                ? dp[i + 1][j + 1] + 1
                : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }

    const ops = [];
    let i = 0;
    let j = 0;
    let oldLine = 1;
    let newLine = 1;

    while (i < n && j < m) {
        if (oldLines[i] === newLines[j]) {
            ops.push({
                type: "context",
                text: oldLines[i],
                oldLine,
                newLine
            });
            i += 1;
            j += 1;
            oldLine += 1;
            newLine += 1;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
            ops.push({
                type: "del",
                text: oldLines[i],
                oldLine,
                newLine
            });
            i += 1;
            oldLine += 1;
        } else {
            ops.push({
                type: "add",
                text: newLines[j],
                oldLine,
                newLine
            });
            j += 1;
            newLine += 1;
        }
    }

    while (i < n) {
        ops.push({
            type: "del",
            text: oldLines[i],
            oldLine,
            newLine
        });
        i += 1;
        oldLine += 1;
    }

    while (j < m) {
        ops.push({
            type: "add",
            text: newLines[j],
            oldLine,
            newLine
        });
        j += 1;
        newLine += 1;
    }

    return ops;
};

const readFileFromSnapshot = async (snapshotRoot, filePath) => {
    const fullPath = path.join(snapshotRoot, filePath);

    try {
        return await fs.promises.readFile(fullPath, "utf-8");
    } catch {
        return null;
    }
};

const findCommonAncestor = async (repoRoot, baseCommitId, headCommitId) => {
    if (!baseCommitId || !headCommitId) {
        return { ancestorId: null, isDirectAncestor: false };
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const ancestorId = await getMergeBase(vcRoot, baseCommitId, headCommitId);

    if (!ancestorId) {
        return { ancestorId: null, isDirectAncestor: false };
    }

    const isDirectAncestor = await isAncestorCommit(
        vcRoot,
        baseCommitId,
        headCommitId
    );

    return { ancestorId, isDirectAncestor };
};

const computeAheadBehind = async (
    repoRoot,
    baseCommitId,
    headCommitId,
    ancestorId
) => {
    if (!baseCommitId || !headCommitId) {
        return {
            ahead: 0,
            behind: 0,
            commitsAhead: [],
            commitsBehind: []
        };
    }

    const effectiveBase = ancestorId || baseCommitId;

    const commitsAhead = [];
    const aheadVisited = new Set();
    const aheadQueue = [headCommitId];

    while (aheadQueue.length > 0) {
        const current = aheadQueue.shift();

        if (current === effectiveBase) {
            continue;
        }

        if (aheadVisited.has(current)) {
            continue;
        }

        aheadVisited.add(current);

        const commit = await getCommit(repoRoot, current);

        if (!commit) {
            continue;
        }

        commitsAhead.push({
            id: commit.id,
            message: commit.message,
            author: commit.author,
            timestamp: commit.timestamp
        });

        for (const p of (commit.parents || [])) {
            if (!aheadVisited.has(p) && p !== effectiveBase) {
                aheadQueue.push(p);
            }
        }
    }

    const commitsBehind = [];
    const behindVisited = new Set();
    const behindQueue = [baseCommitId];

    while (behindQueue.length > 0) {
        const current = behindQueue.shift();

        if (current === effectiveBase) {
            continue;
        }

        if (behindVisited.has(current)) {
            continue;
        }

        behindVisited.add(current);

        const commit = await getCommit(repoRoot, current);

        if (!commit) {
            continue;
        }

        commitsBehind.push({
            id: commit.id,
            message: commit.message,
            author: commit.author,
            timestamp: commit.timestamp
        });

        for (const p of (commit.parents || [])) {
            if (!behindVisited.has(p) && p !== effectiveBase) {
                behindQueue.push(p);
            }
        }
    }

    return {
        ahead: commitsAhead.length,
        behind: commitsBehind.length,
        commitsAhead,
        commitsBehind
    };
};

const computeThreeWayMerge = async (
    repoRoot,
    ancestorCommitId,
    baseCommitId,
    headCommitId
) => {
    const vcRoot = await ensureVersionControl(repoRoot);

    const [ancestorSnap, baseSnap, headSnap] = await Promise.all([
        ancestorCommitId
            ? getSnapshot(vcRoot, ancestorCommitId)
            : null,
        baseCommitId
            ? getSnapshot(vcRoot, baseCommitId)
            : null,
        headCommitId
            ? getSnapshot(vcRoot, headCommitId)
            : null
    ]);

    const ancestorFiles = new Set(
        ancestorSnap ? ancestorSnap.files : []
    );
    const baseFiles = new Set(
        baseSnap ? baseSnap.files : []
    );
    const headFiles = new Set(
        headSnap ? headSnap.files : []
    );

    const allFiles = new Set([
        ...ancestorFiles,
        ...baseFiles,
        ...headFiles
    ]);

    const conflicts = [];
    const mergedContent = {};

    const readFrom = async (snap, filePath) => {
        if (!snap) {
            return null;
        }

        return readFileFromSnapshot(snap.root, filePath);
    };

    for (const file of allFiles) {
        const ancestorContent = await readFrom(ancestorSnap, file);
        const baseContent = await readFrom(baseSnap, file);
        const headContent = await readFrom(headSnap, file);

        const inAncestor = ancestorFiles.has(file);
        const inBase = baseFiles.has(file);
        const inHead = headFiles.has(file);

        const baseChanged = baseContent !== ancestorContent;
        const headChanged = headContent !== ancestorContent;

        const baseDeleted = inAncestor && !inBase;
        const headDeleted = inAncestor && !inHead;

        if (!inAncestor) {
            if (inBase && inHead) {
                if (baseContent === headContent) {
                    mergedContent[file] = headContent;
                } else {
                    conflicts.push({
                        path: file,
                        reason: "both_added",
                        message: `Both sides added "${file}" with different content`
                    });
                }
            } else if (inHead) {
                mergedContent[file] = headContent;
            } else if (inBase) {
                mergedContent[file] = baseContent;
            }
        } else if (baseDeleted && headDeleted) {
            continue;
        } else if (baseDeleted && !headDeleted) {
            if (headChanged) {
                conflicts.push({
                    path: file,
                    reason: "delete_modify",
                    message: `"${file}" was deleted on base but modified on head`
                });
            }
        } else if (!baseDeleted && headDeleted) {
            if (baseChanged) {
                conflicts.push({
                    path: file,
                    reason: "modify_delete",
                    message: `"${file}" was modified on base but deleted on head`
                });
            }
        } else if (baseChanged && headChanged) {
            if (baseContent === headContent) {
                mergedContent[file] = headContent;
            } else {
                conflicts.push({
                    path: file,
                    reason: "both_modified",
                    message: `Both sides modified "${file}" differently`
                });
            }
        } else if (headChanged) {
            mergedContent[file] = headContent;
        } else {
            mergedContent[file] = baseContent;
        }
    }

    conflicts.sort((a, b) => a.path.localeCompare(b.path));

    return {
        mergeable: conflicts.length === 0,
        conflicts,
        mergedContent
    };
};

const computeMergeStatus = async (
    repoRoot,
    sourceBranch,
    targetBranch
) => {
    const vcRoot = await ensureVersionControl(repoRoot);

    const readBranchCommit = async (branch) => {
        try {
            return await getBranchCommitId(repoRoot, branch);
        } catch {
            return null;
        }
    };

    const sourceCommitId = await readBranchCommit(sourceBranch);
    const targetCommitId = await readBranchCommit(targetBranch);

    if (!sourceCommitId || !targetCommitId) {
        return {
            mergeable: false,
            fastForward: false,
            hasConflicts: false,
            conflicts: [],
            ahead: 0,
            behind: 0,
            commonAncestor: null,
            sourceCommitId,
            targetCommitId
        };
    }

    if (sourceCommitId === targetCommitId) {
        return {
            mergeable: true,
            fastForward: false,
            alreadyUpToDate: true,
            hasConflicts: false,
            conflicts: [],
            ahead: 0,
            behind: 0,
            commonAncestor: sourceCommitId,
            sourceCommitId,
            targetCommitId
        };
    }

    const { ancestorId, isDirectAncestor } = await findCommonAncestor(
        repoRoot,
        targetCommitId,
        sourceCommitId
    );

    if (isDirectAncestor) {
        const { ahead, behind, commitsAhead } = await computeAheadBehind(
            repoRoot,
            targetCommitId,
            sourceCommitId,
            ancestorId
        );

        return {
            mergeable: true,
            fastForward: true,
            hasConflicts: false,
            conflicts: [],
            ahead,
            behind,
            commitsAhead,
            commonAncestor: ancestorId,
            sourceCommitId,
            targetCommitId
        };
    }

    const { ahead, behind, commitsAhead } = await computeAheadBehind(
        repoRoot,
        targetCommitId,
        sourceCommitId,
        ancestorId
    );

    const mergeResult = await computeThreeWayMerge(
        repoRoot,
        ancestorId,
        targetCommitId,
        sourceCommitId
    );

    return {
        mergeable: mergeResult.mergeable,
        fastForward: false,
        hasConflicts: !mergeResult.mergeable,
        conflicts: mergeResult.conflicts,
        ahead,
        behind,
        commitsAhead,
        commonAncestor: ancestorId,
        sourceCommitId,
        targetCommitId
    };
};

const performMerge = async (
    repoRoot,
    sourceBranch,
    targetBranch,
    author,
    message
) => {
    const status = await computeMergeStatus(
        repoRoot,
        sourceBranch,
        targetBranch
    );

    if (!status.sourceCommitId || !status.targetCommitId) {
        const error = new Error("Branch not found");
        error.code = "BRANCH_NOT_FOUND";
        throw error;
    }

    if (status.alreadyUpToDate) {
        return {
            merged: false,
            reason: "ALREADY_UP_TO_DATE",
            sourceCommitId: status.sourceCommitId,
            targetCommitId: status.targetCommitId
        };
    }

    if (status.hasConflicts) {
        const error = new Error(
            `Merge conflicts in ${status.conflicts.length} file(s): ${status.conflicts.map((c) => c.path).join(", ")}`
        );
        error.code = "CONFLICTS_DETECTED";
        error.conflicts = status.conflicts;
        throw error;
    }

    if (status.fastForward) {
        return await fastForwardMerge(
            repoRoot,
            sourceBranch,
            targetBranch
        );
    }

    const mergeCommit = await createMergeCommit(repoRoot, {
        message: message || `Merge '${sourceBranch}' into '${targetBranch}'`,
        author,
        parents: [status.targetCommitId, status.sourceCommitId]
    });

    return {
        merged: true,
        fastForward: false,
        mergeCommitId: mergeCommit.id,
        sourceCommitId: status.sourceCommitId,
        targetCommitId: status.targetCommitId,
        previousTargetCommitId: status.targetCommitId,
        workingTreeUpdated: false
    };
};

const computeMergeAnalysis = async (
    repoRoot,
    sourceBranch,
    targetBranch
) => {
    const readBranchCommit = async (branch) => {
        try {
            return await getBranchCommitId(repoRoot, branch);
        } catch {
            return null;
        }
    };

    const sourceCommitId = await readBranchCommit(sourceBranch);
    const targetCommitId = await readBranchCommit(targetBranch);

    const baseResult = {
        sourceBranch,
        targetBranch,
        sourceCommitId,
        targetCommitId,
        commonAncestor: null,
        canFastForward: false,
        isUpToDate: false,
        noChanges: false,
        hasConflicts: false,
        conflicts: [],
        sourceOnly: [],
        targetOnly: [],
        nonOverlapping: [],
        sourceChanges: [],
        targetChanges: []
    };

    if (!sourceCommitId || !targetCommitId) {
        return baseResult;
    }

    if (sourceCommitId === targetCommitId) {
        return {
            ...baseResult,
            commonAncestor: sourceCommitId,
            isUpToDate: true,
            noChanges: true,
            canFastForward: false
        };
    }

    const { ancestorId, isDirectAncestor } = await findCommonAncestor(
        repoRoot,
        targetCommitId,
        sourceCommitId
    );

    if (!ancestorId) {
        return baseResult;
    }

    if (isDirectAncestor) {
        return {
            ...baseResult,
            commonAncestor: ancestorId,
            canFastForward: true,
            noChanges: false,
            hasConflicts: false
        };
    }

    const vcRoot = await ensureVersionControl(repoRoot);

    const [
        ancestorSnap,
        sourceSnap,
        targetSnap
    ] = await Promise.all([
        getSnapshot(vcRoot, ancestorId),
        getSnapshot(vcRoot, sourceCommitId),
        getSnapshot(vcRoot, targetCommitId)
    ]);

    const ancestorFiles = new Set(
        ancestorSnap ? ancestorSnap.files : []
    );
    const sourceFiles = new Set(sourceSnap.files);
    const targetFiles = new Set(targetSnap.files);

    const readContent = async (snap, filePath) => {
        if (!snap) {
            return null;
        }

        return readFileFromSnapshot(snap.root, filePath);
    };

    const classifyFile = async (filePath) => {
        const [
            ancestorContent,
            sourceContent,
            targetContent
        ] = await Promise.all([
            readContent(ancestorSnap, filePath),
            readContent(sourceSnap, filePath),
            readContent(targetSnap, filePath)
        ]);

        const inAncestor = ancestorFiles.has(filePath);
        const inSource = sourceFiles.has(filePath);
        const inTarget = targetFiles.has(filePath);

        const sourceChanged = sourceContent !== ancestorContent;
        const targetChanged = targetContent !== ancestorContent;

        const sourceDeleted = inAncestor && !inSource;
        const targetDeleted = inAncestor && !inTarget;

        if (!sourceChanged && !targetChanged) {
            return { kind: "unchanged" };
        }

        if (sourceChanged && !targetChanged) {
            return {
                kind: "source-only",
                sourceContent
            };
        }

        if (!sourceChanged && targetChanged) {
            return {
                kind: "target-only",
                targetContent
            };
        }

        const ancestorLines = ancestorContent
            ? ancestorContent.split("\n")
            : [];
        const sourceLines = sourceContent
            ? sourceContent.split("\n")
            : [];
        const targetLines = targetContent
            ? targetContent.split("\n")
            : [];

        const tooLarge =
            ancestorLines.length > MAX_ANALYSIS_FILE_LINES ||
            sourceLines.length > MAX_ANALYSIS_FILE_LINES ||
            targetLines.length > MAX_ANALYSIS_FILE_LINES;

        if (tooLarge) {
            return {
                kind: "conflict",
                reason: "file_too_large",
                message: `File "${filePath}" is too large for fine-grained merge analysis`
            };
        }

        const sourceBinary =
            ancestorContent && ancestorContent.includes("\0") ||
            sourceContent && sourceContent.includes("\0");
        const targetBinary =
            ancestorContent && ancestorContent.includes("\0") ||
            targetContent && targetContent.includes("\0");

        if (sourceBinary || targetBinary) {
            return {
                kind: "conflict",
                reason: "binary_file",
                message: `Both branches modified binary file "${filePath}"`
            };
        }

        if (sourceContent === targetContent) {
            return {
                kind: "non-overlapping",
                sourceContent
            };
        }

        if (sourceDeleted && targetDeleted) {
            return {
                kind: "non-overlapping"
            };
        }

        if (sourceDeleted && !targetDeleted) {
            return {
                kind: "conflict",
                reason: "delete_modify",
                message: `"${filePath}" was deleted on source but modified on target`
            };
        }

        if (!sourceDeleted && targetDeleted) {
            return {
                kind: "conflict",
                reason: "modify_delete",
                message: `"${filePath}" was modified on source but deleted on target`
            };
        }

        return { kind: "needs-line-check" };
    };

    const allFiles = new Set([
        ...ancestorFiles,
        ...sourceFiles,
        ...targetFiles
    ]);

    const conflicts = [];
    const sourceOnly = [];
    const targetOnly = [];
    const nonOverlapping = [];
    const sourceChanges = [];
    const targetChanges = [];

    for (const filePath of allFiles) {
        const classification = await classifyFile(filePath);

        const inAncestor = ancestorFiles.has(filePath);
        const inSource = sourceFiles.has(filePath);
        const inTarget = targetFiles.has(filePath);

        const sourceChanged =
            (inSource !== inAncestor) ||
            (inSource && inAncestor);
        const targetChanged =
            (inTarget !== inAncestor) ||
            (inTarget && inAncestor);

        if (classification.kind === "source-only") {
            sourceOnly.push(filePath);
            sourceChanges.push({
                path: filePath,
                status: inAncestor ? "M" : "A"
            });
            continue;
        }

        if (classification.kind === "target-only") {
            targetOnly.push(filePath);
            targetChanges.push({
                path: filePath,
                status: inAncestor ? "M" : "A"
            });
            continue;
        }

        if (classification.kind === "unchanged") {
            continue;
        }

        if (classification.kind === "conflict") {
            conflicts.push({
                path: filePath,
                reason: classification.reason,
                message: classification.message
            });
            continue;
        }

        if (classification.kind === "non-overlapping") {
            nonOverlapping.push(filePath);
            sourceChanges.push({
                path: filePath,
                status: inAncestor ? "M" : "A"
            });
            targetChanges.push({
                path: filePath,
                status: inAncestor ? "M" : "A"
            });
            continue;
        }

        /* needs-line-check */
        const ancestorContent = await readContent(ancestorSnap, filePath);
        const sourceContent = await readContent(sourceSnap, filePath);
        const targetContent = await readContent(targetSnap, filePath);

        const ancestorLines = (ancestorContent || "").split("\n");
        const sourceLines = (sourceContent || "").split("\n");
        const targetLines = (targetContent || "").split("\n");

        const sourceOps = collectRangeOps(ancestorLines, sourceLines);
        const targetOps = collectRangeOps(ancestorLines, targetLines);

        const sourceRanges = collectAncestorRanges(sourceOps);
        const targetRanges = collectAncestorRanges(targetOps);

        const overlaps = sourceRanges.some((s) =>
            targetRanges.some((t) => rangesOverlap(s, t))
        );

        if (overlaps) {
            conflicts.push({
                path: filePath,
                reason: "overlapping_changes",
                message: `Both branches modified overlapping lines in "${filePath}"`
            });
        } else {
            nonOverlapping.push(filePath);
            sourceChanges.push({
                path: filePath,
                status: inAncestor ? "M" : "A"
            });
            targetChanges.push({
                path: filePath,
                status: inAncestor ? "M" : "A"
            });
        }
    }

    conflicts.sort((a, b) => a.path.localeCompare(b.path));
    sourceOnly.sort();
    targetOnly.sort();
    nonOverlapping.sort();

    return {
        sourceBranch,
        targetBranch,
        sourceCommitId,
        targetCommitId,
        commonAncestor: ancestorId,
        canFastForward: false,
        isUpToDate: false,
        noChanges: false,
        hasConflicts: conflicts.length > 0,
        conflicts,
        sourceOnly,
        targetOnly,
        nonOverlapping,
        sourceChanges,
        targetChanges
    };
};

export {
    findCommonAncestor,
    computeAheadBehind,
    computeThreeWayMerge,
    computeMergeStatus,
    performMerge,
    computeMergeAnalysis
};
