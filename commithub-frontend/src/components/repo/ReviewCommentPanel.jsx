import { useCallback, useEffect, useState } from "react";
import {
    fetchReviewComments,
    replyToReviewComment,
    resolveReviewThread,
    unresolveReviewThread,
    deleteReviewComment
} from "../../api/repositoryApi";
import { useAuth } from "../../context/AuthContext";

const shortId = (commitId) =>
    commitId?.slice(0, 7) || "";

const formatTime = (timestamp) =>
    timestamp
        ? new Date(timestamp).toLocaleString()
        : "";

const ReviewCommentPanel = ({
    repositoryId,
    pullRequestNumber,
    isOpen
}) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyBody, setReplyBody] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [filter, setFilter] = useState("all");
    const { user } = useAuth();

    const loadComments = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const params = {};

            if (filter === "resolved") {
                params.resolved = "true";
            } else if (filter === "unresolved") {
                params.resolved = "false";
            }

            const data = await fetchReviewComments(
                repositoryId,
                pullRequestNumber,
                params
            );
            setComments(data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to load review comments"
            );
        } finally {
            setLoading(false);
        }
    }, [repositoryId, pullRequestNumber, filter]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const threads = buildThreads(comments);

    const handleReply = async (parentCommentId) => {
        if (!replyBody.trim()) return;

        setSubmitting(true);
        try {
            await replyToReviewComment(
                repositoryId,
                pullRequestNumber,
                parentCommentId,
                { body: replyBody.trim() }
            );
            setReplyBody("");
            setReplyingTo(null);
            await loadComments();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to post reply"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolve = async (commentId) => {
        setSubmitting(true);
        try {
            await resolveReviewThread(
                repositoryId,
                pullRequestNumber,
                commentId
            );
            await loadComments();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to resolve thread"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnresolve = async (commentId) => {
        setSubmitting(true);
        try {
            await unresolveReviewThread(
                repositoryId,
                pullRequestNumber,
                commentId
            );
            await loadComments();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to unresolve thread"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        setSubmitting(true);
        try {
            await deleteReviewComment(
                repositoryId,
                pullRequestNumber,
                commentId
            );
            await loadComments();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to delete comment"
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && comments.length === 0) {
        return (
            <div className="review-comment-section">
                <h4>Review comments</h4>
                <p className="commit-empty">Loading...</p>
            </div>
        );
    }

    return (
        <div className="review-comment-section">
            <div className="review-comment-header">
                <h4>
                    Review comments ({threads.length})
                </h4>
                <div className="review-comment-filters">
                    {["all", "unresolved", "resolved"].map(
                        (f) => (
                            <button
                                key={f}
                                className={
                                    filter === f
                                        ? "pull-request-filter active"
                                        : "pull-request-filter"
                                }
                                onClick={() => setFilter(f)}
                            >
                                {f}
                            </button>
                        )
                    )}
                </div>
            </div>

            {error && (
                <p className="commit-error">{error}</p>
            )}

            {threads.length === 0 && (
                <p className="commit-empty">
                    No review comments yet.
                </p>
            )}

            {threads.map((thread) => (
                <ReviewThread
                    key={thread.root._id}
                    thread={thread}
                    currentUser={user}
                    isOpen={isOpen}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyBody={replyBody}
                    setReplyBody={setReplyBody}
                    submitting={submitting}
                    onReply={handleReply}
                    onResolve={handleResolve}
                    onUnresolve={handleUnresolve}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
};

function buildThreads(comments) {
    const map = new Map();
    const roots = [];

    for (const c of comments) {
        if (!c.parentComment) {
            const thread = { root: c, replies: [] };
            map.set(c._id, thread);
            roots.push(thread);
        }
    }

    for (const c of comments) {
        if (c.parentComment) {
            const parent =
                map.get(c.parentComment) ||
                roots.find((t) => t.root._id === c.parentComment);
            if (parent) {
                parent.replies.push(c);
            }
        }
    }

    return roots;
}

function ReviewThread({
    thread,
    currentUser,
    isOpen,
    replyingTo,
    setReplyingTo,
    replyBody,
    setReplyBody,
    submitting,
    onReply,
    onResolve,
    onUnresolve,
    onDelete
}) {
    const { root, replies } = thread;
    const isAuthor =
        currentUser &&
        root.author?._id === currentUser._id;

    return (
        <div
            className={`review-thread ${
                root.resolved ? "review-thread-resolved" : ""
            }`}
        >
            <div className="review-thread-file">
                <span className="review-thread-path">
                    {root.filePath}
                </span>
                {root.line != null && (
                    <span className="review-thread-line">
                        Line {root.line}
                    </span>
                )}
                {root.outdated && (
                    <span className="review-outdated-badge">
                        outdated
                    </span>
                )}
                {root.resolved && (
                    <span className="review-resolved-badge">
                        resolved
                    </span>
                )}
            </div>

            <CommentCard
                comment={root}
                currentUser={currentUser}
                onDelete={isAuthor || currentUser?._id ? onDelete : null}
            />

            {replies.map((reply) => (
                <CommentCard
                    key={reply._id}
                    comment={reply}
                    currentUser={currentUser}
                    onDelete={
                        currentUser &&
                        (reply.author?._id === currentUser._id)
                            ? onDelete
                            : null
                    }
                />
            ))}

            {isOpen && (
                <div className="review-thread-actions">
                    {root.resolved ? (
                        <button
                            className="review-unresolve-btn"
                            onClick={() =>
                                onUnresolve(root._id)
                            }
                            disabled={submitting}
                        >
                            Unresolve
                        </button>
                    ) : (
                        <button
                            className="review-resolve-btn"
                            onClick={() =>
                                onResolve(root._id)
                            }
                            disabled={submitting}
                        >
                            Resolve
                        </button>
                    )}

                    {replyingTo === root._id ? (
                        <div className="review-reply-form">
                            <textarea
                                className="pull-request-description-input"
                                placeholder="Write a reply..."
                                value={replyBody}
                                onChange={(e) =>
                                    setReplyBody(e.target.value)
                                }
                                rows={2}
                            />
                            <div className="review-reply-actions">
                                <button
                                    className="commit-submit-btn"
                                    onClick={() =>
                                        onReply(root._id)
                                    }
                                    disabled={
                                        submitting ||
                                        !replyBody.trim()
                                    }
                                >
                                    {submitting
                                        ? "Posting..."
                                        : "Reply"}
                                </button>
                                <button
                                    className="repo-danger-cancel"
                                    onClick={() => {
                                        setReplyingTo(null);
                                        setReplyBody("");
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="review-reply-btn"
                            onClick={() =>
                                setReplyingTo(root._id)
                            }
                        >
                            Reply
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function CommentCard({
    comment,
    currentUser,
    onDelete
}) {
    const isAuthor =
        currentUser &&
        comment.author?._id === currentUser._id;

    return (
        <div
            className={`review-comment-card ${
                comment.outdated ? "review-comment-outdated" : ""
            }`}
        >
            <div className="review-comment-header">
                <span className="review-author">
                    {comment.author?.userName || "Unknown"}
                </span>
                <span className="review-date">
                    {formatTime(comment.createdAt)}
                </span>
                {comment.commit && (
                    <span className="review-commit-id">
                        {shortId(comment.commit)}
                    </span>
                )}
            </div>
            <p className="review-comment-body">
                {comment.body}
            </p>
            {isAuthor && onDelete && (
                <button
                    className="review-delete-btn"
                    onClick={() => onDelete(comment._id)}
                >
                    Delete
                </button>
            )}
        </div>
    );
}

export default ReviewCommentPanel;
