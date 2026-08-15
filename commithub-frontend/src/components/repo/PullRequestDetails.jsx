import { useCallback, useEffect, useState } from "react";
import {
    addPullRequestComment,
    closePullRequest,
    fetchPullRequest,
    mergePullRequest,
    reopenPullRequest,
    submitPullRequestReview
} from "../../api/repositoryApi";

const shortId = (commitId) =>
    commitId?.slice(0, 7) || "";

const formatFullDate = (timestamp) =>
    timestamp
        ? new Date(timestamp).toLocaleString()
        : "";

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

    const load = useCallback(async () => {
        setLoading(true);
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
            setLoading(false);
        }
    }, [repository._id, number]);

    useEffect(() => {
        load();
    }, [load]);

    const refresh = async () => {
        await load();
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
            if (action === "merge") {
                await mergePullRequest(repository._id, number);
            } else if (action === "close") {
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
                {isMerged && pullRequest.mergedBy && (
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

            {isOpen && (
                <div className="pull-request-actions">
                    {isOwner && (
                        <button
                            className="commit-submit-btn"
                            onClick={() => handleAction("merge")}
                            disabled={submitting}
                        >
                            {submitting
                                ? "Merging..."
                                : "Merge pull request"}
                        </button>
                    )}
                    <button
                        className="repo-danger-btn"
                        onClick={() => handleAction("close")}
                        disabled={submitting}
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
                <h4>Files changed</h4>
                {diff && (
                    <p className="commit-change-summary">
                        {diff.stats?.added || 0} added ·{" "}
                        {diff.stats?.deleted || 0} deleted ·{" "}
                        {diff.stats?.modified || 0} modified
                    </p>
                )}
                {(diff?.files || []).map((file) => (
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
                {diff?.files?.length === 0 && (
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
                            <span className="review-date">
                                {formatFullDate(review.createdAt)}
                            </span>
                        </div>
                        {review.comment && (
                            <p className="review-comment">
                                {review.comment}
                            </p>
                        )}
                    </div>
                ))}
                {isOpen && (
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
