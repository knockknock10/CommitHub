import { useEffect, useState } from "react";
import {
    createRepositoryCommit,
    fetchRepositoryChanges,
    fetchRepositoryCommit,
    fetchRepositoryCommits
} from "../../api/repositoryApi";

const shortId = (commitId) => commitId?.slice(0, 7) || "";

const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return date.toLocaleDateString();
};

const formatFullDate = (timestamp) => timestamp ? new Date(timestamp).toLocaleString() : "";

const RepositoryCommits = ({ repository, isOwner }) => {
    const [reload, setReload] = useState(false);
    const [commits, setCommits] = useState([]);
    const [changes, setChanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [commitMessage, setCommitMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [selectedCommit, setSelectedCommit] = useState(null);
    const [commitDetail, setCommitDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [loadError, setLoadError] = useState("");

    const loadCommits = async () => {
        setLoading(true);
        setLoadError("");
        try {
            const data = await fetchRepositoryCommits(repository._id);
            setCommits(data.commits || []);
        } catch (error) {
            setLoadError(error.response?.data?.message || "Failed to load commits");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCommits();
    }, [repository._id, reload]);

    useEffect(() => {
        const loadChanges = async () => {
            try {
                const data = await fetchRepositoryChanges(repository._id);
                setChanges(data.changes || []);
            } catch {
                setChanges([]);
            }
        };
        loadChanges();
    }, [repository._id, reload]);

    const addedCount = changes.filter((change) => change.status === "A").length;
    const modifiedCount = changes.filter((change) => change.status === "M").length;
    const deletedCount = changes.filter((change) => change.status === "D").length;
    const hasChanges = changes.length > 0;

    const handleCommit = async () => {
        if (commitMessage.trim() === "") {
            setMessageType("error");
            setMessage("Commit message is required");
            return;
        }
        setSubmitting(true);
        setMessage("");
        setMessageType("");
        try {
            await createRepositoryCommit(repository._id, commitMessage.trim());
            setCommitMessage("");
            setMessageType("success");
            setMessage("Commit created");
            setReload((prev) => !prev);
        } catch (error) {
            setMessageType("error");
            setMessage(error.response?.data?.message || "Failed to create commit");
        } finally {
            setSubmitting(false);
        }
    };

    const openCommit = async (commitId) => {
        setSelectedCommit(commitId);
        setCommitDetail(null);
        setDetailError("");
        setDetailLoading(true);
        try {
            const data = await fetchRepositoryCommit(repository._id, commitId);
            setCommitDetail(data);
        } catch (error) {
            setDetailError(error.response?.data?.message || "Failed to load commit");
        } finally {
            setDetailLoading(false);
        }
    };

    if (selectedCommit) {
        return (
            <div className="gh-commit-detail">
                <button className="gh-commit-back" onClick={() => setSelectedCommit(null)}>
                    ← Back to commits
                </button>

                {detailLoading && <div className="shared-loading"><p>Loading commit details...</p></div>}
                {detailError && <div className="shared-error"><p>{detailError}</p></div>}

                {commitDetail && (
                    <>
                        <div className="gh-commit-header">
                            <div className="gh-commit-header-main">
                                <h2 className="gh-commit-msg">{commitDetail.message}</h2>
                                <div className="gh-commit-header-meta">
                                    <span className="gh-commit-hash">commit {commitDetail.id}</span>
                                    <span className="gh-commit-author">{commitDetail.author?.name || "Unknown"}</span>
                                    <span className="gh-commit-date">{formatFullDate(commitDetail.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="gh-commit-files">
                            {(commitDetail.files || []).map((file) => (
                                <div key={file.path} className="gh-diff-container">
                                    <div className="gh-diff-header">
                                        <span className={`gh-diff-status gh-diff-status-${file.status.toLowerCase()}`}>
                                            {file.status === 'A' ? 'Added' : file.status === 'M' ? 'Modified' : 'Deleted'}
                                        </span>
                                        <span className="gh-diff-path">{file.path}</span>
                                    </div>
                                    <div className="gh-diff-body">
                                        {/* Simulating a diff view since API provides the file content */}
                                        <div className="gh-diff-line gh-diff-line-add">
                                            <span className="gh-diff-num">+</span>
                                            <span className="gh-diff-content">{file.content || "..."}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="gh-commits-view">
            {isOwner && (
                <div className="gh-commit-create">
                    <div className="gh-commit-create-header">
                        <h3>Create commit</h3>
                        {hasChanges ? (
                            <p className="gh-commit-change-summary">
                                {changes.length} changed file{changes.length === 1 ? "" : "s"}
                                {modifiedCount > 0 && ` · ${modifiedCount} modified`}
                                {addedCount > 0 && ` · ${addedCount} added`}
                                {deletedCount > 0 && ` · ${deletedCount} deleted`}
                            </p>
                        ) : (
                            <p className="gh-commit-change-summary">Working tree clean</p>
                        )}
                    </div>

                    {hasChanges && (
                        <div className="gh-commit-change-list">
                            {changes.slice(0, 10).map((change) => (
                                <div key={change.path} className="gh-commit-file-row">
                                    <span className={`gh-commit-status gh-commit-status-${change.status.toLowerCase()}`}>
                                        {change.status}
                                    </span>
                                    <span className="gh-commit-file-path">{change.path}</span>
                                </div>
                            ))}
                            {changes.length > 10 && <p className="gh-commit-change-more">...and {changes.length - 10} more</p>}
                        </div>
                    )}

                    <div className="gh-commit-create-form">
                        <input
                            className="gh-commit-message-input"
                            type="text"
                            placeholder="Commit message"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            maxLength={200}
                        />
                        <button
                            className="gh-commit-submit-btn"
                            onClick={handleCommit}
                            disabled={submitting || !hasChanges}
                        >
                            {submitting ? "Committing..." : "Commit"}
                        </button>
                    </div>

                    {message && <p className={`gh-commit-msg-status ${messageType}`}>{message}</p>}
                </div>
            )}

            <div className="gh-commit-history">
                <div className="gh-commit-history-header">
                    <h3>Commit history</h3>
                </div>

                {loading && <div className="shared-loading"><p>Loading commits...</p></div>}
                {loadError && (
                    <div className="shared-error">
                        <p>{loadError}</p>
                        <button type="button" className="state-btn" onClick={loadCommits}>Retry</button>
                    </div>
                )}

                {!loading && !loadError && commits.length === 0 && (
                    <div className="shared-empty-state"><p>No commits yet.</p></div>
                )}

                {!loading && !loadError && commits.length > 0 && (
                    <div className="gh-commit-list">
                        {commits.map((commit) => (
                            <button key={commit.id} className="gh-commit-row" onClick={() => openCommit(commit.id)}>
                                <div className="gh-commit-row-main">
                                    <span className="gh-commit-row-id">{shortId(commit.id)}</span>
                                    <span className="gh-commit-row-msg">{commit.message}</span>
                                </div>
                                <div className="gh-commit-row-meta">
                                    <span className="gh-commit-author">{commit.author?.name || "Unknown"}</span>
                                    <span className="gh-commit-date">{formatDate(commit.timestamp)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RepositoryCommits;
