import path from "path";

import PullRequest from "../models/pullRequestModel.js";
import { authorizeRepository } from "../utils/repoAccess.js";
import {
    MAX_FILE_SIZE,
    getRepoRoot,
    resolveRepoPath
} from "../utils/repoStorage.js";
import {
    MAX_COMMIT_MESSAGE_LENGTH,
    getBranchCommitId,
    getMergeBase,
    getSnapshot,
    ensureVersionControl,
    isAncestorCommit,
    createResolutionCommit
} from "../utils/repoVersion.js";
import {
    computeThreeWayMerge,
    computeMergeStatus,
    computeConflictRegions,
    readFileFromSnapshot
} from "../utils/diffMerge.js";
import { createActivity } from "../utils/activityService.js";

const RESOLUTION_STRATEGIES = ["keep_source", "keep_target", "custom"];
const RESOLVABLE_REASONS = ["both_added", "both_modified"];
const MAX_RESOLVED_FILES = 50;

const parseNumber = (value) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return 0;
    }

    return parsed;
};

const findPullRequest = async (repositoryId, number) =>
    PullRequest.findOne({
        repository: repositoryId,
        number
    });

const readBranchHead = async (repoRoot, branch) => {
    try {
        return await getBranchCommitId(repoRoot, branch);
    } catch {
        return null;
    }
};

const splitLines = (content) => (content === null ? [] : content.split("\n"));

const isSafeManagedPath = (root, requestedPath) => {
    if (
        typeof requestedPath !== "string" ||
        requestedPath.trim() === ""
    ) {
        return false;
    }

    const safePath = resolveRepoPath(root, requestedPath);

    if (!safePath || safePath === root) {
        return false;
    }

    const relative = path.relative(root, safePath);

    return (
        relative !== ".CommitHub" &&
        !relative.startsWith(".CommitHub" + path.sep)
    );
};

const validateCustomContent = (content) => {
    if (typeof content !== "string") {
        const error = new Error("Resolved content must be a string");
        error.code = "CONTENT_TYPE";
        throw error;
    }

    if (Buffer.byteLength(content, "utf8") > MAX_FILE_SIZE) {
        const error = new Error("Resolved content is too large");
        error.code = "TOO_LARGE";
        throw error;
    }

    if (content.includes("\0")) {
        const error = new Error(
            "Binary resolved content is not supported"
        );
        error.code = "BINARY_CONTENT";
        throw error;
    }

    if (
        content.includes("<<<<<<<") ||
        content.includes(">>>>>>>")
    ) {
        const error = new Error(
            "Resolved content still contains conflict markers"
        );
        error.code = "CONFLICT_MARKERS";
        throw error;
    }
};

const buildDefaultMessage = (resolvedPaths) =>
    resolvedPaths.length === 1
        ? `Resolve merge conflict in ${resolvedPaths[0]}`
        : `Resolve merge conflicts in ${resolvedPaths.length} files`;

/* Loads the repository, the open pull request, the current branch heads
   and a freshly computed three-way conflict set. Responds itself and
   returns null when the request cannot proceed. */
const loadConflictContext = async (req, res, writeOperation) => {
    const result = await authorizeRepository(req, res, writeOperation);

    if (!result) {
        return null;
    }

    const number = parseNumber(req.params.number);

    if (number === 0) {
        res.status(400).json({
            message: "Invalid pull request number"
        });
        return null;
    }

    const pullRequest = await findPullRequest(
        result.repository._id,
        number
    );

    if (!pullRequest) {
        res.status(404).json({
            message: "Pull request not found"
        });
        return null;
    }

    if (pullRequest.status !== "open") {
        res.status(400).json({
            message: `Pull request is ${pullRequest.status}; conflicts can only be resolved while it is open`
        });
        return null;
    }

    const repoRoot = getRepoRoot(
        result.repository.owner,
        result.repository._id
    );

    const sourceCommitId = await readBranchHead(
        repoRoot,
        pullRequest.sourceBranch
    );
    const targetCommitId = await readBranchHead(
        repoRoot,
        pullRequest.targetBranch
    );

    if (!sourceCommitId || !targetCommitId) {
        res.status(409).json({
            message: "Source or target branch no longer exists",
            status: "INVALID"
        });
        return null;
    }

    if (sourceCommitId === targetCommitId) {
        res.status(409).json({
            message: "Branches point at the same commit; nothing to resolve",
            status: "NO_CONFLICTS"
        });
        return null;
    }

    const vcRoot = await ensureVersionControl(repoRoot);
    const sourceIsBehind = await isAncestorCommit(
        vcRoot,
        sourceCommitId,
        targetCommitId
    );

    if (sourceIsBehind) {
        res.status(409).json({
            message: "Target already contains the source branch; nothing to resolve",
            status: "NO_CONFLICTS"
        });
        return null;
    }

    const ancestorId = await getMergeBase(
        vcRoot,
        sourceCommitId,
        targetCommitId
    );

    const mergeResult = await computeThreeWayMerge(
        repoRoot,
        ancestorId,
        targetCommitId,
        sourceCommitId
    );

    if (mergeResult.mergeable) {
        res.status(409).json({
            message: "The pull request has no conflicts to resolve",
            status: "NO_CONFLICTS"
        });
        return null;
    }

    return {
        repository: result.repository,
        pullRequest,
        repoRoot,
        vcRoot,
        sourceCommitId,
        targetCommitId,
        ancestorId,
        mergeResult
    };
};

export const getConflictDetail = async (req, res) => {
    try {
        const context = await loadConflictContext(req, res, false);

        if (!context) {
            return;
        }

        const filePath = req.query.path;

        if (typeof filePath !== "string" || filePath.trim() === "") {
            return res.status(400).json({
                message: "Query parameter \"path\" is required"
            });
        }

        const conflict = context.mergeResult.conflicts.find(
            (entry) => entry.path === filePath
        );

        if (!conflict) {
            return res.status(404).json({
                message: "File is not currently conflicted"
            });
        }

        const resolvable = RESOLVABLE_REASONS.includes(conflict.reason);

        const [ancestorSnap, sourceSnap, targetSnap] = await Promise.all([
            context.ancestorId
                ? getSnapshot(context.vcRoot, context.ancestorId)
                : null,
            getSnapshot(context.vcRoot, context.sourceCommitId),
            getSnapshot(context.vcRoot, context.targetCommitId)
        ]);

        const baseContent = ancestorSnap
            ? await readFileFromSnapshot(ancestorSnap.root, filePath)
            : null;
        const sourceContent = await readFileFromSnapshot(
            sourceSnap.root,
            filePath
        );
        const targetContent = await readFileFromSnapshot(
            targetSnap.root,
            filePath
        );

        const regions = resolvable
            ? computeConflictRegions(
                splitLines(baseContent),
                splitLines(sourceContent),
                splitLines(targetContent)
            )
            : [];

        return res.status(200).json({
            path: conflict.path,
            reason: conflict.reason,
            message: conflict.message,
            resolvable,
            sourceBranch: context.pullRequest.sourceBranch,
            targetBranch: context.pullRequest.targetBranch,
            sourceCommitId: context.sourceCommitId,
            targetCommitId: context.targetCommitId,
            commonAncestor: context.ancestorId,
            baseContent,
            sourceContent,
            targetContent,
            regions
        });
    } catch (error) {
        console.error("Get conflict detail error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};

export const resolveConflicts = async (req, res) => {
    try {
        const context = await loadConflictContext(req, res, true);

        if (!context) {
            return;
        }

        const {
            resolutions,
            expectedSourceHead,
            expectedTargetHead,
            message
        } = req.body ?? {};

        if (!Array.isArray(resolutions) || resolutions.length === 0) {
            return res.status(400).json({
                message: "Resolutions array is required"
            });
        }

        if (resolutions.length > MAX_RESOLVED_FILES) {
            return res.status(400).json({
                message: `Cannot resolve more than ${MAX_RESOLVED_FILES} files at once`
            });
        }

        if (typeof expectedSourceHead !== "string" || !expectedSourceHead) {
            return res.status(400).json({
                message: "expectedSourceHead is required to detect stale resolutions"
            });
        }

        if (typeof expectedTargetHead !== "string" || !expectedTargetHead) {
            return res.status(400).json({
                message: "expectedTargetHead is required to detect stale resolutions"
            });
        }

        if (expectedSourceHead !== context.sourceCommitId) {
            return res.status(409).json({
                message: "Source branch changed since the conflicts were loaded; reload and resolve again",
                status: "STALE_SOURCE_BRANCH",
                sourceCommitId: context.sourceCommitId
            });
        }

        if (expectedTargetHead !== context.targetCommitId) {
            return res.status(409).json({
                message: "Target branch changed since the conflicts were loaded; reload and resolve again",
                status: "STALE_TARGET_BRANCH",
                targetCommitId: context.targetCommitId
            });
        }

        if (
            message !== undefined &&
            message !== null &&
            (typeof message !== "string" ||
                message.trim().length > MAX_COMMIT_MESSAGE_LENGTH)
        ) {
            return res.status(400).json({
                message: `Commit message must be ${MAX_COMMIT_MESSAGE_LENGTH} characters or fewer`
            });
        }

        const conflictMap = new Map(
            context.mergeResult.conflicts.map((entry) => [
                entry.path,
                entry
            ])
        );

        const seenPaths = new Set();
        const unresolvable = [];

        for (const conflict of context.mergeResult.conflicts) {
            if (!RESOLVABLE_REASONS.includes(conflict.reason)) {
                unresolvable.push(conflict.path);
            }
        }

        if (unresolvable.length > 0) {
            return res.status(422).json({
                message: "These conflicts cannot be resolved through the resolver (delete/modify or unsupported); resolve them with normal commits on the branches",
                status: "NOT_RESOLVABLE",
                files: unresolvable
            });
        }

        for (const resolution of resolutions) {
            if (
                !resolution ||
                typeof resolution !== "object" ||
                Array.isArray(resolution)
            ) {
                return res.status(400).json({
                    message: "Each resolution must be an object"
                });
            }

            const { path: filePath, strategy, content } = resolution;

            if (!conflictMap.has(filePath)) {
                return res.status(400).json({
                    message: `"${filePath}" is not currently conflicted`,
                    status: "UNKNOWN_PATH"
                });
            }

            if (seenPaths.has(filePath)) {
                return res.status(400).json({
                    message: `Duplicate resolution for "${filePath}"`,
                    status: "DUPLICATE_PATH"
                });
            }

            seenPaths.add(filePath);

            if (!RESOLUTION_STRATEGIES.includes(strategy)) {
                return res.status(400).json({
                    message: `Invalid strategy for "${filePath}"; use keep_source, keep_target or custom`
                });
            }

            if (strategy === "custom") {
                try {
                    validateCustomContent(content);
                } catch (error) {
                    return res.status(400).json({
                        message: error.message,
                        status: error.code
                    });
                }
            }
        }

        const unresolved = context.mergeResult.conflicts
            .map((entry) => entry.path)
            .filter((filePath) => !seenPaths.has(filePath));

        if (unresolved.length > 0) {
            return res.status(422).json({
                message: "All conflicts must be resolved before the source branch can be updated",
                status: "INCOMPLETE_RESOLUTIONS",
                files: unresolved
            });
        }

        const [sourceSnap, targetSnap] = await Promise.all([
            getSnapshot(context.vcRoot, context.sourceCommitId),
            getSnapshot(context.vcRoot, context.targetCommitId)
        ]);

        const finalFiles = { ...context.mergeResult.mergedContent };

        for (const resolution of resolutions) {
            if (resolution.strategy === "keep_source") {
                finalFiles[resolution.path] =
                    await readFileFromSnapshot(
                        sourceSnap.root,
                        resolution.path
                    );
            } else if (resolution.strategy === "keep_target") {
                finalFiles[resolution.path] =
                    await readFileFromSnapshot(
                        targetSnap.root,
                        resolution.path
                    );
            } else {
                finalFiles[resolution.path] = resolution.content;
            }
        }

        const resolvedPaths = resolutions.map(
            (resolution) => resolution.path
        );
        const commitMessage =
            typeof message === "string" && message.trim() !== ""
                ? message.trim()
                : buildDefaultMessage(resolvedPaths);

        let commit;

        try {
            commit = await createResolutionCommit(context.repoRoot, {
                branch: context.pullRequest.sourceBranch,
                files: finalFiles,
                message: commitMessage,
                author: {
                    name: req.user.userName,
                    email: req.user.email
                },
                mergeParentId: context.targetCommitId
            });
        } catch (error) {
            if (error.code === "DIRTY_TREE") {
                return res.status(409).json({
                    message: error.message,
                    status: "DIRTY_TREE"
                });
            }

            throw error;
        }

        await createActivity({
            actor: req.user._id,
            type: "COMMIT_CREATED",
            repository: context.repository._id,
            pullRequest: context.pullRequest._id,
            commitId: commit.id,
            metadata: {
                message: commit.message,
                kind: "conflict_resolution",
                files: resolvedPaths
            }
        });

        const status = await computeMergeStatus(
            context.repoRoot,
            context.pullRequest.sourceBranch,
            context.pullRequest.targetBranch
        );

        let mergeState = "READY";

        if (status.alreadyUpToDate) {
            mergeState = "ALREADY_UP_TO_DATE";
        } else if (status.hasConflicts) {
            mergeState = "CONFLICTS";
        }

        return res.status(200).json({
            resolved: true,
            number: context.pullRequest.number,
            sourceBranch: context.pullRequest.sourceBranch,
            targetBranch: context.pullRequest.targetBranch,
            commitId: commit.id,
            previousSourceCommitId: context.sourceCommitId,
            resolvedFiles: resolvedPaths,
            mergeStatus: {
                status: mergeState,
                mergeable: status.mergeable,
                fastForward: status.fastForward,
                hasConflicts: status.hasConflicts,
                conflicts: status.conflicts,
                ahead: status.ahead,
                behind: status.behind,
                commonAncestor: status.commonAncestor,
                sourceCommitId: status.sourceCommitId,
                targetCommitId: status.targetCommitId
            }
        });
    } catch (error) {
        console.error("Resolve conflicts error:", error.message);
        return res.status(500).json({ message: "Server error" });
    }
};
