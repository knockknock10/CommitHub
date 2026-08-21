import { useEffect, useState } from "react";
import {
    fetchPullRequestConflict,
    resolvePullRequestConflicts
} from "../../api/repositoryApi";

const RESOLVABLE_REASONS = ["both_added", "both_modified"];

const describeResolveError = (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const statusCode = error.response?.data?.status;

    if (status === 409) {
        if (statusCode === "STALE_SOURCE_BRANCH") {
            return "The source branch changed since the conflicts were loaded. Reload the resolver and try again.";
        }

        if (statusCode === "STALE_TARGET_BRANCH") {
            return "The target branch changed since the conflicts were loaded. Reload the resolver and try again.";
        }

        if (statusCode === "DIRTY_TREE") {
            return serverMessage || "The source branch is checked out with uncommitted changes.";
        }

        return serverMessage || "There are no conflicts left to resolve.";
    }

    if (status === 422) {
        const files = error.response?.data?.files;

        if (Array.isArray(files) && files.length > 0) {
            return `${serverMessage} Unresolved: ${files.join(", ")}`;
        }

        return serverMessage || "Some conflicts could not be processed.";
    }

    if (status === 403) {
        return "You are not authorized to resolve conflicts on this pull request.";
    }

    if (status === 404) {
        return serverMessage || "Conflict not found. Refresh the merge status.";
    }

    return serverMessage || "Failed to resolve conflicts";
};

const containsConflictMarkers = (content) =>
    content.includes("<<<<<<<") || content.includes(">>>>>>>");

const VersionPane = ({ label, branchName, content, regions }) => {
    const lines = (content ?? "").split("\n");
    const inRegion = (lineNumber) =>
        regions.some(
            (region) =>
                lineNumber >= region.start && lineNumber <= region.end
        );

    return (
        <div className="conflict-pane">
            <div className="conflict-pane-head">
                <span className={`conflict-pane-label ${label.toLowerCase()}`}>
                    {label}
                </span>
                <span className="conflict-pane-branch">
                    {branchName}
                </span>
            </div>
            <div className="conflict-pane-body">
                {content === null ? (
                    <p className="conflict-pane-empty">
                        File does not exist on this side.
                    </p>
                ) : (
                    lines.map((line, index) => (
                        <div
                            key={index}
                            className={`conflict-line ${
                                inRegion(index + 1)
                                    ? "highlighted"
                                    : ""
                            }`}
                        >
                            <span className="conflict-line-number">
                                {index + 1}
                            </span>
                            <span className="conflict-line-text">
                                {line === "" ? " " : line}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const PullRequestConflictResolver = ({
    repositoryId,
    pullRequest,
    conflicts,
    onResolved
}) => {
    const [selectedPath, setSelectedPath] = useState(
        conflicts[0]?.path || ""
    );
    const [detail, setDetail] = useState(null);
    const [detailError, setDetailError] = useState("");
    const [resolutions, setResolutions] = useState({});
    const [customDrafts, setCustomDrafts] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitMessage, setSubmitMessage] = useState("");

    useEffect(() => {
        if (!selectedPath) {
            return;
        }

        let active = true;

        fetchPullRequestConflict(
            repositoryId,
            pullRequest.number,
            selectedPath
        )
            .then((data) => {
                if (active) {
                    setDetail(data);
                    setDetailError("");
                }
            })
            .catch((error) => {
                if (active) {
                    setDetail(null);
                    setDetailError(
                        error.response?.data?.message ||
                        `Failed to load conflict for "${selectedPath}"`
                    );
                }
            });

        return () => {
            active = false;
        };
    }, [selectedPath, repositoryId, pullRequest.number]);

    const detailLoaded =
        detail !== null && detail.path === selectedPath;

    const resolvableConflicts = conflicts.filter((conflict) =>
        RESOLVABLE_REASONS.includes(conflict.reason)
    );
    const unresolvableConflicts = conflicts.filter(
        (conflict) => !RESOLVABLE_REASONS.includes(conflict.reason)
    );

    const allResolved =
        resolvableConflicts.length > 0 &&
        resolvableConflicts.every((conflict) => {
            const resolution = resolutions[conflict.path];

            if (!resolution) {
                return false;
            }

            if (resolution.strategy !== "custom") {
                return true;
            }

            const draft = customDrafts[conflict.path];

            return (
                typeof draft === "string" &&
                draft.trim() !== "" &&
                !containsConflictMarkers(draft)
            );
        });

    const selectFile = (path) => {
        setSelectedPath(path);
        setSubmitError("");
    };

    const chooseStrategy = (path, strategy) => {
        setResolutions((previous) => ({
            ...previous,
            [path]: { strategy }
        }));
        setSubmitError("");

        if (
            strategy === "custom" &&
            customDrafts[path] === undefined &&
            detail &&
            detail.path === path
        ) {
            const initial =
                detail.sourceContent ??
                detail.targetContent ??
                "";

            setCustomDrafts((previous) => ({
                ...previous,
                [path]: initial
            }));
        }
    };

    const updateDraft = (path, content) => {
        setCustomDrafts((previous) => ({
            ...previous,
            [path]: content
        }));
    };

    const handleSubmit = async () => {
        if (submitting || !allResolved) {
            return;
        }

        setSubmitting(true);
        setSubmitError("");
        setSubmitMessage("");

        try {
            const payload = {
                resolutions: resolvableConflicts.map((conflict) => {
                    const resolution = resolutions[conflict.path];

                    return {
                        path: conflict.path,
                        strategy: resolution.strategy,
                        ...(resolution.strategy === "custom"
                            ? {
                                content:
                                    customDrafts[conflict.path]
                            }
                            : {})
                    };
                }),
                expectedSourceHead: detail.sourceCommitId,
                expectedTargetHead: detail.targetCommitId
            };

            const result = await resolvePullRequestConflicts(
                repositoryId,
                pullRequest.number,
                payload
            );

            setSubmitMessage(
                `Resolved ${result.resolvedFiles.length} file${result.resolvedFiles.length === 1 ? "" : "s"} with commit ${result.commitId.slice(0, 7)}.`
            );
            onResolved(result);
        } catch (error) {
            setSubmitError(describeResolveError(error));
        } finally {
            setSubmitting(false);
        }
    };

    const baseRegions = (detail?.regions || []).map((region) => ({
        start: region.baseStart,
        end: region.baseEnd
    }));

    return (
        <div className="conflict-resolver">
            <div className="conflict-resolver-head">
                <h4>Resolve conflicts</h4>
                <p>
                    Choose a version for every conflicted file. All
                    files must be resolved together; the result is
                    committed to{" "}
                    <strong>{pullRequest.sourceBranch}</strong> and
                    the target branch is never modified.
                </p>
            </div>

            <ul className="conflict-file-list">
                {conflicts.map((conflict) => {
                    const resolvable =
                        RESOLVABLE_REASONS.includes(conflict.reason);
                    const resolved =
                        resolvable && resolutions[conflict.path];

                    return (
                        <li key={conflict.path}>
                            <button
                                type="button"
                                className={`conflict-file-item ${
                                    selectedPath === conflict.path
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    selectFile(conflict.path)
                                }
                            >
                                <span className="conflict-file-path">
                                    {conflict.path}
                                </span>
                                {resolved ? (
                                    <span className="conflict-file-badge resolved">
                                        Resolved
                                    </span>
                                ) : resolvable ? (
                                    <span className="conflict-file-badge unresolved">
                                        Unresolved
                                    </span>
                                ) : (
                                    <span className="conflict-file-badge manual">
                                        Needs manual commits
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {unresolvableConflicts.length > 0 && (
                <p className="conflict-resolver-note">
                    Delete/modify conflicts cannot be resolved here.
                    Resolve them with normal commits on the branches.
                </p>
            )}

            {!detailError && !detailLoaded && (
                <p className="conflict-resolver-loading">
                    Loading conflict...
                </p>
            )}

            {detailError && (
                <p className="commit-error">{detailError}</p>
            )}

            {detailLoaded && (
                <>
                    <div className="conflict-panes">
                        <VersionPane
                            label="Base"
                            branchName="common ancestor"
                            content={detail.baseContent}
                            regions={baseRegions}
                        />
                        <VersionPane
                            label="Source"
                            branchName={detail.sourceBranch}
                            content={detail.sourceContent}
                            regions={detail.regions.map(
                                (region) => region.source
                            )}
                        />
                        <VersionPane
                            label="Target"
                            branchName={detail.targetBranch}
                            content={detail.targetContent}
                            regions={detail.regions.map(
                                (region) => region.target
                            )}
                        />
                    </div>

                    <div className="conflict-strategy-row">
                        <button
                            type="button"
                            className={`conflict-strategy-btn ${
                                resolutions[selectedPath]
                                    ?.strategy === "keep_source"
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                chooseStrategy(
                                    selectedPath,
                                    "keep_source"
                                )
                            }
                        >
                            Keep source ({detail.sourceBranch})
                        </button>
                        <button
                            type="button"
                            className={`conflict-strategy-btn ${
                                resolutions[selectedPath]
                                    ?.strategy === "keep_target"
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                chooseStrategy(
                                    selectedPath,
                                    "keep_target"
                                )
                            }
                        >
                            Keep target ({detail.targetBranch})
                        </button>
                        <button
                            type="button"
                            className={`conflict-strategy-btn ${
                                resolutions[selectedPath]
                                    ?.strategy === "custom"
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                chooseStrategy(selectedPath, "custom")
                            }
                        >
                            Custom
                        </button>
                    </div>

                    {resolutions[selectedPath]?.strategy ===
                        "custom" && (
                        <textarea
                            className="conflict-custom-input"
                            value={customDrafts[selectedPath] ?? ""}
                            onChange={(event) =>
                                updateDraft(
                                    selectedPath,
                                    event.target.value
                                )
                            }
                            rows={10}
                            placeholder="Edit the resolved file content..."
                        />
                    )}

                    {resolutions[selectedPath]?.strategy ===
                        "custom" &&
                        containsConflictMarkers(
                            customDrafts[selectedPath] ?? ""
                        ) && (
                            <p className="commit-error">
                                Content still contains conflict
                                markers.
                            </p>
                        )}

                    <div className="conflict-resolver-actions">
                        <button
                            type="button"
                            className="commit-submit-btn"
                            onClick={handleSubmit}
                            disabled={
                                submitting ||
                                !allResolved ||
                                unresolvableConflicts.length > 0
                            }
                        >
                            {submitting
                                ? "Applying resolution..."
                                : `Apply resolution (${Object.keys(resolutions).length}/${resolvableConflicts.length})`}
                        </button>
                        {submitMessage && (
                            <span className="conflict-resolver-success">
                                {submitMessage}
                            </span>
                        )}
                    </div>

                    {submitError && (
                        <p className="commit-error">{submitError}</p>
                    )}
                </>
            )}
        </div>
    );
};

export default PullRequestConflictResolver;
