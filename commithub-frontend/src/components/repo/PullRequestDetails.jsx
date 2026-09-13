import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    CheckIcon,
    CloseIcon,
    GitMergeIcon
} from "../ui/icons";
import {
    fetchPullRequest,
    closePullRequest,
    reopenPullRequest,
    mergePullRequest,
    addPullRequestComment
} from "../../api/repositoryApi";
import "../../styles/pullRequestComponents.css";

const PullRequestDetails = ({ repository, isOwner }) => {
    const { number } = useParams();
    const [pr, setPr] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [comment, setComment] = useState("");
    const [busy, setBusy] = useState(false);
    const [posting, setPosting] = useState(false);
    const [actionError, setActionError] = useState("");

    const loadPR = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchPullRequest(repository._id, number);
            setPr(data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load pull request.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPR();
    }, [repository._id, number]);

    const handleStatusToggle = async () => {
        setBusy(true);
        setActionError("");
        try {
            if (pr.status === "open") {
                await closePullRequest(repository._id, number);
            } else {
                await reopenPullRequest(repository._id, number);
            }
            await loadPR();
        } catch (err) {
            setActionError(err.response?.data?.message || "Failed to update pull request.");
        } finally {
            setBusy(false);
        }
    };

    const handleMerge = async () => {
        setBusy(true);
        setActionError("");
        try {
            await mergePullRequest(repository._id, number);
            await loadPR();
        } catch (err) {
            setActionError(err.response?.data?.message || "Failed to merge pull request.");
        } finally {
            setBusy(false);
        }
    };

    const handleCommentSubmit = async () => {
        if (!comment.trim()) return;
        setPosting(true);
        setActionError("");
        try {
            await addPullRequestComment(repository._id, number, {
                content: comment
            });
            setComment("");
            await loadPR();
        } catch (err) {
            setActionError(err.response?.data?.message || "Failed to post comment.");
        } finally {
            setPosting(false);
        }
    };

    if (loading) return <div className="shared-loading"><p>Loading pull request...</p></div>;
    if (error && !pr) return <div className="shared-error"><p>{error}</p><button className="state-btn" onClick={loadPR}>Retry</button></div>;
    if (!pr) return <div className="shared-error"><p>Pull request not found.</p></div>;

    const author = pr.author?.userName || "Unknown";
    const isOpen = pr.status === "open";

    return (
        <div className="gh-pr-details">
            <div className="gh-pr-header">
                <div className="gh-pr-header-title">
                    <h1 className="gh-pr-title">#{pr.number} {pr.title}</h1>
                    <div className="gh-pr-header-meta">
                        <span className="gh-pr-meta-item">
                            <Link to={`/profile/${pr.author?._id}`} className="repo-link">{author}</Link>
                            {" "}wants to merge <span className="mono">{pr.sourceBranch}</span> into{" "}
                            <span className="mono">{pr.targetBranch}</span>
                        </span>
                    </div>
                </div>
                <div className="gh-pr-header-actions">
                    <button className={`gh-pr-status-btn ${pr.status}`}>{pr.status}</button>
                    {isOwner && isOpen && (
                        <button className="gh-pr-merge-btn" onClick={handleMerge} disabled={busy}>
                            <GitMergeIcon size={14} /> Merge pull request
                        </button>
                    )}
                    {isOwner && (
                        <button className="gh-pr-close-btn" onClick={handleStatusToggle} disabled={busy}>
                            {isOpen
                                ? <><CloseIcon size={14} /> Close</>
                                : <><CheckIcon size={14} /> Reopen</>}
                        </button>
                    )}
                </div>
            </div>

            {actionError && <div className="shared-error"><p>{actionError}</p></div>}

            <div className="gh-pr-main">
                <div className="gh-pr-conversation">
                    <div className="gh-pr-timeline">
                        <div className="gh-pr-event main-event">
                            <div className="gh-pr-event-header">
                                <div className="gh-pr-event-user">
                                    <div className="gh-avatar">{author[0]?.toUpperCase()}</div>
                                    <span className="gh-user-name">{author}</span>
                                    <span className="gh-event-action">opened this pull request</span>
                                    <span className="gh-event-time">{new Date(pr.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                            <div className="gh-pr-event-body">
                                <p>{pr.description || "No description provided."}</p>
                            </div>
                        </div>

                        {(pr.comments || []).map((c) => (
                            <div className="gh-pr-comment" key={c._id}>
                                <div className="gh-pr-comment-header">
                                    <div className="gh-pr-comment-user">
                                        <div className="gh-avatar">{c.user?.userName?.[0]?.toUpperCase()}</div>
                                        <span className="gh-user-name">{c.user?.userName || c.author?.userName || "Unknown"}</span>
                                        <span className="gh-event-time">{new Date(c.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="gh-pr-comment-body">
                                    <p>{c.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="gh-pr-comment-box">
                        <div className="gh-comment-box-tabs">
                            <button className="gh-comment-tab active">Write</button>
                        </div>
                        <textarea
                            className="gh-comment-textarea"
                            placeholder="Leave a comment..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <div className="gh-comment-box-footer">
                            <button
                                className="gh-comment-submit"
                                onClick={handleCommentSubmit}
                                disabled={posting || !comment.trim()}
                            >
                                {posting ? "Posting..." : "Comment"}
                            </button>
                        </div>
                    </div>
                </div>

                <aside className="gh-pr-sidebar">
                    <div className="gh-pr-sidebar-section">
                        <span className="gh-sidebar-label">Reviewers</span>
                        <div className="gh-sidebar-content"><span className="gh-sidebar-empty">None</span></div>
                    </div>
                    <div className="gh-pr-sidebar-section">
                        <span className="gh-sidebar-label">Assignees</span>
                        <div className="gh-sidebar-content"><span className="gh-sidebar-empty">None</span></div>
                    </div>
                    <div className="gh-pr-sidebar-section">
                        <span className="gh-sidebar-label">Branches</span>
                        <div className="gh-sidebar-content">
                            <span className="mono">{pr.sourceBranch}</span> →{" "}
                            <span className="mono">{pr.targetBranch}</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PullRequestDetails;