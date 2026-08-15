import { useEffect, useState } from "react";
import {
    createRepositoryCommit,
    fetchRepositoryChanges,
    fetchRepositoryCommit,
    fetchRepositoryCommits
} from "../../api/repositoryApi";

const shortId = (commitId) =>
    commitId?.slice(0, 7) || "";

const formatDate = (timestamp) => {
    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
        return "just now";
    }

    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)} minutes ago`;
    }

    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)} hours ago`;
    }

    return date.toLocaleDateString();
};

const formatFullDate = (timestamp) =>
    timestamp
        ? new Date(timestamp).toLocaleString()
        : "";

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

    useEffect(() => {
        const loadCommits = async () => {
            setLoading(true);

            try {
                const data = await fetchRepositoryCommits(
                    repository._id
                );
                setCommits(data.commits || []);
            } catch (error) {
                setMessageType("error");
                setMessage(
                    error.response?.data?.message ||
                    "Failed to load commits"
                );
            } finally {
                setLoading(false);
            }
        };
        loadCommits();
    }, [repository._id, reload]);

    useEffect(() => {
        const loadChanges = async () => {
            try {
                const data = await fetchRepositoryChanges(
                    repository._id
                );
                setChanges(data.changes || []);
            } catch {
                setChanges([]);
            }
        };
        loadChanges();
    }, [repository._id, reload]);

    const addedCount =
        changes.filter((change) => change.status === "A").length;
    const modifiedCount =
        changes.filter((change) => change.status === "M").length;
    const deletedCount =
        changes.filter((change) => change.status === "D").length;
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
            await createRepositoryCommit(
                repository._id,
                commitMessage.trim()
            );
            setCommitMessage("");
            setMessageType("success");
            setMessage("Commit created");
            setReload((prev) => !prev);
        } catch (error) {
            setMessageType("error");
            setMessage(
                error.response?.data?.message ||
                "Failed to create commit"
            );
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
            const data = await fetchRepositoryCommit(
                repository._id,
                commitId
            );
            setCommitDetail(data);
        } catch (error) {
            setDetailError(
                error.response?.data?.message ||
                "Failed to load commit"
            );
        } finally {
            setDetailLoading(false);
        }
    };

    if (selectedCommit) {
        return (
            <div className="commit-detail">
                <button
                    className="file-viewer-back"
                    onClick={() => setSelectedCommit(null)}
                >
                    Back to commits
                </button>

                {detailLoading && <p>Loading commit...</p>}

                {detailError && (
                    <p className="commit-error">{detailError}</p>
                )}

                {commitDetail && (
                    <>
                        <div className="commit-detail-header">
                            <h3>{commitDetail.message}</h3>
                            <p className="commit-id">
                                commit {commitDetail.id}
                            </p>
                            <p>
                                Author:{" "}
                                {commitDetail.author?.name || "Unknown"}
                            </p>
                            <p>
                                Date:{" "}
                                {formatFullDate(commitDetail.timestamp)}
                            </p>
                            <p>
                                Parent:{" "}
                                {commitDetail.parent
                                    ? shortId(commitDetail.parent)
                                    : "None"}
                            </p>
                        </div>
                        <div className="commit-files">
                            {commitDetail.files.map((file) => (
                                <div
                                    key={file.path}
                                    className="commit-file-row"
                                >
                                    <span
                                        className={`commit-status commit-status-${file.status.toLowerCase()}`}
                                    >
                                        {file.status}
                                    </span>
                                    <span className="commit-file-path">
                                        {file.path}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="commits-view">
            {isOwner && (
                <div className="commit-create">
                    <div className="commit-create-header">
                        <h3>Create commit</h3>
                        {hasChanges ? (
                            <p className="commit-change-summary">
                                {changes.length} changed file
                                {changes.length === 1 ? "" : "s"}
                                {modifiedCount > 0 &&
                                    ` · ${modifiedCount} modified`}
                                {addedCount > 0 &&
                                    ` · ${addedCount} added`}
                                {deletedCount > 0 &&
                                    ` · ${deletedCount} deleted`}
                            </p>
                        ) : (
                            <p className="commit-change-summary">
                                Working tree clean
                            </p>
                        )}
                    </div>

                    {hasChanges && (
                        <div className="commit-change-list">
                            {changes.slice(0, 10).map((change) => (
                                <div
                                    key={change.path}
                                    className="commit-file-row"
                                >
                                    <span
                                        className={`commit-status commit-status-${change.status.toLowerCase()}`}
                                    >
                                        {change.status}
                                    </span>
                                    <span className="commit-file-path">
                                        {change.path}
                                    </span>
                                </div>
                            ))}
                            {changes.length > 10 && (
                                <p className="commit-change-more">
                                    ...and {changes.length - 10} more
                                </p>
                            )}
                        </div>
                    )}

                    <div className="commit-create-form">
                        <input
                            className="commit-message-input"
                            type="text"
                            placeholder="Commit message"
                            value={commitMessage}
                            onChange={(e) =>
                                setCommitMessage(e.target.value)
                            }
                            maxLength={200}
                        />
                        <button
                            className="commit-submit-btn"
                            onClick={handleCommit}
                            disabled={submitting || !hasChanges}
                        >
                            {submitting
                                ? "Committing..."
                                : "Commit"}
                        </button>
                    </div>

                    {message && (
                        <p
                            className={`commit-message ${messageType}`}
                        >
                            {message}
                        </p>
                    )}
                </div>
            )}

            <div className="commit-history">
                <h3>Commit history</h3>

                {loading && <p>Loading commits...</p>}

                {!loading && commits.length === 0 && (
                    <p className="commit-empty">
                        No commits yet.
                    </p>
                )}

                {!loading && commits.length > 0 && (
                    <div className="commit-list">
                        {commits.map((commit) => (
                            <button
                                key={commit.id}
                                className="commit-row"
                                onClick={() => openCommit(commit.id)}
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
                                    <span>
                                        {commit.author?.name || "Unknown"}
                                    </span>
                                    <span>
                                        {formatDate(commit.timestamp)}
                                    </span>
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
