import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
    UserIcon,
    CloseIcon,
    CheckIcon
} from "../components/ui/icons";
import { getIssueById, closeIssue, reopenIssue } from "../api/issueApi";
import { getComments, createComment } from "../api/commentApi";
import "../styles/issuePage.css";

const IssuePage = () => {
    const { id } = useParams();
    const [issue, setIssue] = useState(null);
    const [comments, setComments] = useState([]);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [statusBusy, setStatusBusy] = useState(false);

    const loadIssue = async (issueId) => {
        setLoading(true);
        setError("");
        try {
            const data = await getIssueById(issueId);
            setIssue(data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load issue.");
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async (issueId) => {
        try {
            const data = await getComments(issueId);
            setComments(data || []);
        } catch {
            setComments([]);
        }
    };

    useEffect(() => {
        loadIssue(id);
        loadComments(id);
    }, [id]);

    const handleCommentSubmit = async () => {
        if (!comment.trim()) return;
        setSubmitting(true);
        setError("");
        try {
            await createComment(issue._id, { content: comment });
            setComment("");
            await loadComments(issue._id);
            const refreshed = await getIssueById(issue._id);
            setIssue(refreshed);
        } catch {
            setError("Failed to post comment.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusToggle = async () => {
        if (!issue) return;
        setStatusBusy(true);
        setError("");
        try {
            if (issue.status === "open") {
                await closeIssue(issue._id);
            } else {
                await reopenIssue(issue._id);
            }
            await loadIssue(issue._id);
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to update issue status."
            );
        } finally {
            setStatusBusy(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="shared-loading">
                    <p>Loading issue...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error && !issue) {
        return (
            <DashboardLayout>
                <div className="shared-error">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="state-btn"
                        onClick={() => loadIssue(id)}
                    >
                        Retry
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    if (!issue) {
        return (
            <DashboardLayout>
                <div className="shared-empty-state">
                    <p>Issue not found.</p>
                </div>
            </DashboardLayout>
        );
    }

    const isOpen = issue.status === "open";

    return (
        <DashboardLayout>
            <div className="gh-issue-page">
                <div className="gh-issue-header">
                    <div className="gh-issue-title-row">
                        <h1 className="gh-issue-title">{issue.title}</h1>
                        <div className="gh-issue-header-actions">
                            <button
                                className={`gh-issue-status-btn ${isOpen ? "open" : "closed"}`}
                                onClick={handleStatusToggle}
                                disabled={statusBusy}
                            >
                                {isOpen
                                    ? <><CloseIcon size={14} /> Close</>
                                    : <><CheckIcon size={14} /> Reopen</>}
                            </button>
                        </div>
                    </div>
                    <div className="gh-issue-meta">
                        <span className="gh-issue-meta-item">
                            <UserIcon size={14} />
                            <Link to={`/profile/${issue.author?._id}`} className="repo-link">
                                {issue.author?.userName || "Unknown"}
                            </Link>
                            {" "}opened this issue
                        </span>
                        <span className="gh-issue-meta-item">
                            {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="gh-issue-main">
                    <div className="gh-issue-conversation">
                        <div className="gh-comment-list">
                            <div className="gh-comment">
                                <div className="gh-comment-header">
                                    <div className="gh-comment-user">
                                        <div className="gh-comment-avatar">
                                            {issue.author?.userName?.[0]?.toUpperCase() || "?"}
                                        </div>
                                        <span className="gh-comment-username">
                                            {issue.author?.userName || "Unknown"}
                                        </span>
                                        <span className="gh-comment-date">
                                            {new Date(issue.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="gh-comment-body">
                                    <p>{issue.description}</p>
                                </div>
                            </div>

                            {comments.length === 0 ? (
                                <div className="shared-empty-state">
                                    <p>No comments yet.</p>
                                </div>
                            ) : (
                                comments.map((c) => (
                                    <div className="gh-comment" key={c._id}>
                                        <div className="gh-comment-header">
                                            <div className="gh-comment-user">
                                                <div className="gh-comment-avatar">
                                                    {c.author?.userName?.[0]?.toUpperCase() || "?"}
                                                </div>
                                                <span className="gh-comment-username">
                                                    {c.author?.userName || "Unknown"}
                                                </span>
<span className="gh-comment-date">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                        <div className="gh-comment-body">
                                            <p>{c.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="gh-comment-box">
                            <div className="gh-comment-box-tabs">
                                <button className="gh-comment-tab active">Write</button>
                                <button className="gh-comment-tab">Preview</button>
                            </div>
                            <textarea
                                className="gh-comment-textarea"
                                placeholder="Leave a comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                            <div className="gh-comment-box-footer">
                                <button
                                    className="gh-comment-submit"
                                    onClick={handleCommentSubmit}
                                    disabled={submitting || !comment.trim()}
                                >
                                    {submitting ? "Posting..." : "Comment"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <aside className="gh-issue-sidebar">
                        <div className="gh-sidebar-section">
                            <span className="gh-sidebar-label">Assignee</span>
                            <div className="gh-sidebar-content">
                                {issue.assignee?.userName ? (
                                    <span className="gh-sidebar-user">
                                        {issue.assignee.userName}
                                    </span>
                                ) : (
                                    <span className="gh-sidebar-empty">None</span>
                                )}
                            </div>
                        </div>
                        <div className="gh-sidebar-section">
                            <span className="gh-sidebar-label">Labels</span>
                            <div className="gh-sidebar-content">
                                {issue.label ? (
                                    <span className="gh-issue-label">{issue.label}</span>
                                ) : (
                                    <span className="gh-sidebar-empty">None</span>
                                )}
                            </div>
                        </div>
                        <div className="gh-sidebar-section">
                            <span className="gh-sidebar-label">Progress</span>
                            <div className="gh-sidebar-content">
                                <span className={`gh-issue-status ${issue.status}`}>
                                    {isOpen ? "Open" : "Closed"}
                                </span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default IssuePage;