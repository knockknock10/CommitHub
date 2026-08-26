import { useCallback, useEffect, useState } from "react";
import {
    addPullRequestComment,
    closePullRequest,
    fetchPullRequest,
    fetchPullRequestMergeStatus,
    mergePullRequest,
    reopenPullRequest,
    submitPullRequestReview
} from "../../api/repositoryApi";
import PullRequestConflictResolver from "./PullRequestConflictResolver";
import { useAuth } from "../../context/AuthContext";

const shortId = (commitId) =>
    commitId?.slice(0, 7) || "";

const formatFullDate = (timestamp) =>
    timestamp
        ? new Date(timestamp).toLocaleString()
        : "";

const MERGE_STATE_LABELS = {
    READY: "Ready to merge",
    CONFLICTS: "Conflicts",
    BLOCKED: "Review required",
    ALREADY_UP_TO_DATE: "Already up to date",
    ALREADY_MERGED: "Merged",
    CLOSED: "Closed",
    INVALID: "Unavailable"
};

const describeMergeError = (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;

    if (status === 409) {
        if (error.response?.data?.status === "CONFLICTS") {
            return "This pull request has conflicts and cannot be merged.";
        }

        return serverMessage || "This pull request has already been merged.";
    }

    if (status === 400) {
        if (serverMessage && serverMessage.includes("closed")) {
            return "This pull request is closed.";
        }

        return serverMessage || "This pull request cannot be merged.";
    }

    if (status === 401 || status === 403) {
        return "You are not authorized to merge this pull request.";
    }

    if (status === 404) {
        return "Pull request not found.";
    }

    if (status === 422) {
        return serverMessage || "The merge request could not be processed.";
    }

    return serverMessage || "Failed to merge pull request";
};

const PullRequestDetails = ({
    repository,
    isOwner,
    number,
    onBack
}) => {
    const [pullRequest, setPullRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [reviewState, setReviewState] = useState("");
    const [reviewComment, setReviewComment] = useState("");
    const [reviewing, setReviewing] = useState(false);
    const [expandedFile, setExpandedFile] = useState(null);
    const [mergeStatus, setMergeStatus] = useState(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusError, setStatusError] = useState("");
    const [merging, setMerging] = useState(false);
    const { user } = useAuth();

    const load = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
        setError("");

        try {
            const data = await fetchPullRequest(
                repository._id,
                number
            );
            setPullRequest(data);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to load pull request"
            );
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [repository._id, number]);

    const loadMergeStatus = useCallback(async () => {
        setStatusLoading(true);
        setStatusError("");

        try {
            const data = await fetchPullRequestMergeStatus(
                repository._id,
                number
            );
            setMergeStatus(data);
        } catch (error) {
            setStatusError(
                error.response?.data?.message ||
                "Failed to load merge status"
            );
        } finally {
            setStatusLoading(false);
        }
    }, [repository._id, number]);

    useEffect(() => {
        load();
        loadMergeStatus();
    }, [load, loadMergeStatus]);

    const refresh = async () => {
        await Promise.all([load(true), loadMergeStatus()]);
    };

    const handleComment = async () => {
        if (comment.trim() === "") {
            setMessageType("error");
            setMessage("Comment content is required");
            return;
        }

        setSubmitting(true);
        setMessage("");
        setMessageType("");

        try {
            await addPullRequestComment(
                repository._id,
                number,
                { content: comment.trim() }
            );
            setComment("");
            await refresh();
        } catch (error) {
            setMessageType("error");
            setMessage(
                error.response?.data?.message ||
                "Failed to add comment"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleReview = async () => {
        if (reviewState === "") {
            setMessageType("error");
            setMessage("Review state is required");
            return;
        }

        setSubmitting(true);
        setMessage("");
        setMessageType("");

        try {
            await submitPullRequestReview(
                repository._id,
                number,
                {
                    state: reviewState,
                    comment: reviewComment.trim()
                }
            );
            setReviewState("");
            setReviewComment("");
            setReviewing(false);
            await refresh();
        } catch (error) {
            setMessageType("error");
            setMessage(
                error.response?.data?.message ||
                "Failed to submit review"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleAction = async (action) => {
        setSubmitting(true);
        setMessage("");
        setMessageType("");

        try {
            if (action === "close") {
                await closePullRequest(repository._id, number);
            } else if (action === "reopen") {
                await reopenPullRequest(repository._id, number);
            }
            setMessageType("success");
            setMessage("Pull request updated");
            await refresh();
        } catch (error) {
            setMessageType("error");
            setMessage(
                error.response?.data?.message ||
                "Action failed"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleMerge = async () => {
        if (merging) {
            return;
        }

        setMerging(true);
        setMessage("");
        setMessageType("");

        try {
            const result = await mergePullRequest(
                repository._id,
                number
            );
            setMessageType("success");
            setMessage(result.message || "Pull request merged");
            await refresh();
        } catch (error) {
            setMessageType("error");
            setMessage(describeMergeError(error));
            await refresh();
        } finally {
            setMerging(false);
        }
    };

    if (loading) {
        return (
            <div className="pull-request-detail">
                <button
                    className="file-viewer-back"
                    onClick={onBack}
                >
                    Back to pull requests
                </button>
                <p>Loading pull request...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pull-request-detail">
                <button
                    className="file-viewer-back"
                    onClick={onBack}
                >
                    Back to pull requests
                </button>
                <p className="commit-error">{error}</p>
            </div>
        );
    }

    const diff = pullRequest.diff;
    const isOpen = pullRequest.status === "open";
    const isMerged = pullRequest.status === "merged";
    const reviewStates = ["approved", "changes_requested", "commented"];
    /* the backend rejects self-reviews; hide the controls to match */
    const canReview =
        isOpen &&
        user !== null &&
        pullRequest.author?._id !== undefined &&
        pullRequest.author._id !== user._id;

    const changedFiles = diff?.files || [];
    const totalAdditions = changedFiles.reduce(
        (sum, file) => sum + (file.additions || 0),
        0
    );
    const totalDeletions = changedFiles.reduce(
        (sum, file) => sum + (file.deletions || 0),
        0
    );

    const mergeState = mergeStatus?.status || "";
    const mergeStateLabel =
        MERGE_STATE_LABELS[mergeState] || "Unavailable";
    const mergeAvailable =
        isOwner &&
        isOpen &&
        mergeStatus !== null &&
        mergeStatus.mergeable === true;
    const isOutOfDate = (mergeStatus?.behind || 0) > 0;

    const mergeSummary = () => {
        if (!mergeStatus) {
            return "";
        }

        switch (mergeStatus.status) {
            case "READY":
                return mergeStatus.fastForward
                    ? "No conflicts with the target branch. Merging will fast-forward the target branch."
                    : "No conflicts with the target branch.";
            case "BLOCKED":
                return "Branch protection requirements are not satisfied yet.";
            case "CONFLICTS":
                return "This pull request cannot be merged automatically.";
            case "ALREADY_UP_TO_DATE":
                return "The source branch has no new commits to merge.";
            case "ALREADY_MERGED":
                return "This pull request has already been merged.";
            case "CLOSED":
                return "This pull request is closed.";
            case "INVALID":
                if (mergeStatus.sourceBranchExists === false) {
                    return `The source branch "${mergeStatus.sourceBranch}" no longer exists.`;
                }
                if (mergeStatus.targetBranchExists === false) {
                    return `The target branch "${mergeStatus.targetBranch}" no longer exists.`;
                }
                return "Merge status is unavailable.";
            default:
                return "Merge status is unavailable.";
        }
    };

    return (
        <div className="pull-request-detail">
            <button
                className="file-viewer-back"
                onClick={onBack}
            >
                Back to pull requests
            </button>

            <div className="pull-request-detail-header">
                <div className="pull-request-detail-title-row">
                    <h3>
                        #{pullRequest.number} {pullRequest.title}
                    </h3>
                    <span
                        className={`pull-request-state ${pullRequest.status}`}
                    >
                        {pullRequest.status}
                    </span>
                </div>
                <p>
                    {pullRequest.sourceBranch} →{" "}
                    {pullRequest.targetBranch}
                </p>
                <p>
                    Opened by {pullRequest.author?.userName || "Unknown"}{" "}
                    on {formatFullDate(pullRequest.createdAt)}
                </p>
                {isMerged && (
                    <p>
                        Merged by {pullRequest.mergedBy?.userName ||
                            "Unknown"} on{" "}
                        {formatFullDate(pullRequest.mergedAt)}
                    </p>
                )}
                {pullRequest.description && (
                    <p className="pull-request-description">
                        {pullRequest.description}
                    </p>
                )}
                {isMerged && (
                    <p className="pull-request-merge-commit">
                        Merge commit: {shortId(
                            pullRequest.mergeCommitId
                        )}
                    </p>
                )}
            </div>

            {message && (
                <p className={`commit-message ${messageType}`}>
                    {message}
                </p>
            )}

            <div className="pull-request-section">
                <h4>Merge status</h4>
                {statusLoading && !mergeStatus ? (
                    <p className="commit-empty">
                        Checking merge status...
                    </p>
                ) : statusError && !mergeStatus ? (
                    <div className="merge-status-error">
                        <p className="commit-error">{statusError}</p>
                        <button
                            className="pull-request-review-btn"
                            onClick={loadMergeStatus}
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div
                        className={`merge-status-card ${
                            mergeState.toLowerCase() ||
                            "unavailable"
                        }`}
                    >
                        <div className="merge-status-head">
                            <span
                                className={`merge-state-badge ${
                                    mergeState.toLowerCase() ||
                                    "unavailable"
                                }`}
                            >
                                {mergeStateLabel}
                            </span>
                            <span className="merge-status-branches">
                                {pullRequest.sourceBranch} →{" "}
                                {pullRequest.targetBranch}
                            </span>
                            <button
                                className="merge-refresh-btn"
                                onClick={loadMergeStatus}
                                disabled={statusLoading || merging}
                            >
                                {statusLoading
                                    ? "Refreshing..."
                                    : "Refresh status"}
                            </button>
                        </div>
                        <p className="merge-status-summary">
                            {mergeSummary()}
                        </p>
                        <div className="merge-meta">
                            <span>
                                {mergeStatus.ahead || 0} commit
                                {(mergeStatus.ahead || 0) === 1
                                    ? ""
                                    : "s"}{" "}
                                ahead
                            </span>
                            <span>
                                {mergeStatus.behind || 0} behind
                            </span>
                            <span>
                                {changedFiles.length} file
                                {changedFiles.length === 1 ? "" : "s"}{" "}
                                changed
                            </span>
                            <span className="merge-meta-additions">
                                +{totalAdditions}
                            </span>
                            <span className="merge-meta-deletions">
                                -{totalDeletions}
                            </span>
                        </div>
                        {isOutOfDate && isOpen && (
                            <div className="merge-outdated">
                                This pull request is out of date with
                                the target branch. Refresh the merge
                                status to re-check mergeability.
                            </div>
                        )}
                        {mergeStatus.branchProtection && (
                            <div className="protection-panel">
                                <h5>Branch protection</h5>
                                <p className="protection-summary">
                                    {mergeStatus.reviewRequirements.approvalsReceived}{" "}
                                    approval
                                    {(mergeStatus.reviewRequirements.approvalsReceived) === 1
                                        ? ""
                                        : "s"}{" "}
                                    received ·{" "}
                                    {mergeStatus.reviewRequirements.requiredApprovals}{" "}
                                    required
                                    {mergeStatus.reviewRequirements.staleReviews > 0 && (
                                        <>
                                            {" "}·{" "}
                                            {mergeStatus.reviewRequirements.staleReviews}{" "}
                                            stale
                                        </>
                                    )}
                                </p>
                                {mergeStatus.reviewRequirements.satisfied && !mergeStatus.hasConflicts ? (
                                    <p className="protection-satisfied">
                                        All review requirements are satisfied.
                                    </p>
                                ) : (
                                    <ul className="merge-block-reasons">
                                        {(mergeStatus.blockReasons || []).map(
                                            (reason) => (
                                                <li key={reason.code}>
                                                    <span className="block-reason-code">
                                                        {reason.code}
                                                    </span>
                                                    <span className="block-reason-message">
                                                        {reason.message}
                                                    </span>
                                                </li>
                                            )
                                        )}
                                    </ul>
                                )}
                            </div>
                        )}
                        {mergeStatus.hasConflicts &&
                            (mergeStatus.conflicts || []).length > 0 && (
                                <div className="merge-conflicts">
                                    <h5>Conflicts</h5>
                                    <p className="merge-conflicts-hint">
                                        The following files conflict and
                                        must be resolved before this pull
                                        request can be merged:
                                    </p>
                                    <ul>
                                        {(mergeStatus.conflicts || []).map(
                                            (conflict) => (
                                                <li
                                                    key={conflict.path}
                                                    className="merge-conflict-file"
                                                >
                                                    <span className="merge-conflict-path">
                                                        {conflict.path}
                                                    </span>
                                                    {conflict.message && (
                                                        <span className="merge-conflict-reason">
                                                            {conflict.message}
                                                        </span>
                                                    )}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            )}
                        {isMerged && mergeStatus.mergeCommitId && (
                            <p className="pull-request-merge-commit">
                                Merge commit:{" "}
                                {shortId(mergeStatus.mergeCommitId)} on{" "}
                                {formatFullDate(
                                    mergeStatus.mergedAt ||
                                    pullRequest.mergedAt
                                )}
                            </p>
                        )}
                    </div>
                )}
                {isOwner &&
                    isOpen &&
                    mergeStatus !== null &&
                    mergeStatus.hasConflicts &&
                    (mergeStatus.conflicts || []).length > 0 && (
                        <PullRequestConflictResolver
                            repositoryId={repository._id}
                            pullRequest={pullRequest}
                            conflicts={mergeStatus.conflicts}
                            onResolved={refresh}
                        />
                    )}
                {mergeAvailable && (
                    <div className="pull-request-actions">
                        <button
                            className="commit-submit-btn"
                            onClick={handleMerge}
                            disabled={merging || submitting}
                        >
                            {merging
                                ? "Merging..."
                                : "Merge pull request"}
                        </button>
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="pull-request-actions">
                    <button
                        className="repo-danger-btn"
                        onClick={() => handleAction("close")}
                        disabled={submitting || merging}
                    >
                        Close
                    </button>
                </div>
            )}

            {!isOpen && !isMerged && (
                <button
                    className="pull-request-reopen-btn"
                    onClick={() => handleAction("reopen")}
                    disabled={submitting}
                >
                    Reopen
                </button>
            )}

            <div className="pull-request-section">
                <h4>
                    Commits ({pullRequest.commits?.length || 0})
                </h4>
                {(!pullRequest.commits ||
                    pullRequest.commits.length === 0) && (
                    <p className="commit-empty">No commits.</p>
                )}
                <div className="commit-list">
                    {(pullRequest.commits || []).map((commit) => (
                        <div
                            key={commit.id}
                            className="commit-row"
                        >
                            <div className="commit-row-main">
                                <span className="commit-row-id">
                                    {shortId(commit.id)}
                                </span>
                                <span className="commit-row-message">
                                    {commit.message}
                                </span>
                            </div>
                            <div className="commit-row-meta">
                                <span>{commit.author || "Unknown"}</span>
                                <span>
                                    {formatFullDate(commit.timestamp)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pull-request-section">
                <h4>Files changed ({changedFiles.length})</h4>
                {diff && (
                    <p className="commit-change-summary">
                        {diff.stats?.added || 0} added ·{" "}
                        {diff.stats?.deleted || 0} deleted ·{" "}
                        {diff.stats?.modified || 0} modified ·{" "}
                        +{totalAdditions} -{totalDeletions} lines
                    </p>
                )}
                {changedFiles.map((file) => (
                    <div key={file.path} className="diff-file">
                        <div className="diff-file-header">
                            <button
                                className="diff-file-toggle"
                                onClick={() =>
                                    setExpandedFile(
                                        expandedFile === file.path
                                            ? null
                                            : file.path
                                    )
                                }
                            >
                                <span
                                    className={`commit-status commit-status-${file.status.toLowerCase()}`}
                                >
                                    {file.status}
                                </span>
                                <span className="commit-file-path">
                                    {file.path}
                                </span>
                                {file.approximate && (
                                    <span className="diff-approximate">
                                        (approximate)
                                    </span>
                                )}
                            </button>
                            {!file.binary && (
                                <span className="diff-file-stats">
                                    +{file.additions || 0} -{file.deletions || 0}
                                </span>
                            )}
                        </div>
                        {expandedFile === file.path && (
                            file.binary ? (
                                <p className="commit-empty">
                                    Binary file
                                </p>
                            ) : (
                                <div className="diff-hunks">
                                    {(file.hunks || []).map(
                                        (hunk, index) => (
                                            <div
                                                key={index}
                                                className="diff-hunk"
                                            >
                                                <div className="diff-hunk-header">
                                                    @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                                                </div>
                                                {hunk.lines.map(
                                                    (line, lineIndex) => (
                                                        <div
                                                            key={lineIndex}
                                                            className={`diff-line diff-line-${line.type}`}
                                                        >
                                                            <span className="diff-line-prefix">
                                                                {line.type === "add"
                                                                    ? "+"
                                                                    : line.type === "del"
                                                                        ? "-"
                                                                        : " "}
                                                            </span>
                                                            <span className="diff-line-text">
                                                                {line.text}
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            )
                        )}
                    </div>
                ))}
                {changedFiles.length === 0 && (
                    <p className="commit-empty">No file changes.</p>
                )}
            </div>

            <div className="pull-request-section">
                <h4>Reviews</h4>
                {(pullRequest.reviews || []).length === 0 && (
                    <p className="commit-empty">No reviews yet.</p>
                )}
                {(pullRequest.reviews || []).map((review, index) => (
                    <div key={index} className="review-card">
                        <div className="review-card-header">
                            <span className="review-author">
                                {review.reviewer?.userName || "Unknown"}
                            </span>
                            <span
                                className={`review-state review-state-${review.state}`}
                            >
                                {review.state}
                            </span>
                            {review.stale && (
                                <span className="review-stale-badge">
                                    stale
                                </span>
                            )}
                            <span className="review-date">
                                {formatFullDate(review.createdAt)}
                            </span>
                        </div>
                        {review.reviewedCommit && (
                            <p className="review-meta-commit">
                                Reviewed commit: {shortId(review.reviewedCommit)}
                            </p>
                        )}
                        {review.comment && (
                            <p className="review-comment">
                                {review.comment}
                            </p>
                        )}
                    </div>
                ))}
                {canReview && (
                    <div className="review-create">
                        {!reviewing ? (
                            <button
                                className="pull-request-review-btn"
                                onClick={() => setReviewing(true)}
                            >
                                Submit review
                            </button>
                        ) : (
                            <div className="review-create-form">
                                <div className="review-state-row">
                                    {reviewStates.map((state) => (
                                        <button
                                            key={state}
                                            className={
                                                reviewState === state
                                                    ? "pull-request-filter active"
                                                    : "pull-request-filter"
                                            }
                                            onClick={() =>
                                                setReviewState(state)
                                            }
                                        >
                                            {state}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    className="pull-request-description-input"
                                    placeholder="Review comment"
                                    value={reviewComment}
                                    onChange={(e) =>
                                        setReviewComment(e.target.value)
                                    }
                                    maxLength={500}
                                    rows={3}
                                />
                                <div className="review-create-actions">
                                    <button
                                        className="commit-submit-btn"
                                        onClick={handleReview}
                                        disabled={submitting}
                                    >
                                        {submitting
                                            ? "Submitting..."
                                            : "Submit review"}
                                    </button>
                                    <button
                                        className="repo-danger-cancel"
                                        onClick={() => {
                                            setReviewing(false);
                                            setReviewState("");
                                            setReviewComment("");
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="pull-request-section">
                <h4>Comments</h4>
                {(pullRequest.comments || []).length === 0 && (
                    <p className="commit-empty">No comments yet.</p>
                )}
                {(pullRequest.comments || []).map((item, index) => (
                    <div key={index} className="review-card">
                        <div className="review-card-header">
                            <span className="review-author">
                                {item.author?.userName || "Unknown"}
                            </span>
                            <span className="review-date">
                                {formatFullDate(item.createdAt)}
                            </span>
                        </div>
                        <p className="review-comment">{item.content}</p>
                    </div>
                ))}
                {isOpen && (
                    <div className="comment-create">
                        <textarea
                            className="pull-request-description-input"
                            placeholder="Leave a comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                        />
                        <button
                            className="commit-submit-btn"
                            onClick={handleComment}
                            disabled={submitting || comment.trim() === ""}
                        >
                            {submitting ? "Posting..." : "Comment"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PullRequestDetails;
