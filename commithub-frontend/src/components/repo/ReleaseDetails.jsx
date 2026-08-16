import { useEffect, useState } from "react";
import {
    fetchRelease,
    fetchRepositoryTags,
    updateRelease
} from "../../api/repositoryApi";

const shortId = (commitId) => commitId?.slice(0, 7) || "";

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
    timestamp ? new Date(timestamp).toLocaleString() : "";

const ReleaseDetails = ({ repository, isOwner, releaseId, onBack }) => {
    const [release, setRelease] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tags, setTags] = useState([]);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        title: "",
        description: "",
        tagName: ""
    });
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    useEffect(() => {
        const loadRelease = async () => {
            setLoading(true);
            setError("");

            try {
                const data = await fetchRelease(
                    repository._id,
                    releaseId
                );
                setRelease(data);
            } catch (loadError) {
                setError(
                    loadError.response?.data?.message ||
                    "Failed to load release"
                );
            } finally {
                setLoading(false);
            }
        };
        loadRelease();
    }, [repository._id, releaseId]);

    useEffect(() => {
        const loadTags = async () => {
            if (!isOwner) {
                return;
            }

            try {
                const data = await fetchRepositoryTags(
                    repository._id,
                    { limit: 100 }
                );
                setTags(data.tags || []);
            } catch {
                setTags([]);
            }
        };
        loadTags();
    }, [repository._id, isOwner]);

    const startEditing = () => {
        setEditForm({
            title: release?.title || "",
            description: release?.description || "",
            tagName: release?.tagName || ""
        });
        setMessage("");
        setMessageType("");
        setEditing(true);
    };

    const handleSave = async () => {
        if (editForm.title.trim() === "") {
            setMessageType("error");
            setMessage("Title is required");
            return;
        }

        setSaving(true);
        setMessage("");
        setMessageType("");

        const payload = {
            title: editForm.title.trim(),
            description: editForm.description.trim()
        };

        if (release.status === "draft") {
            payload.tagName = editForm.tagName;
        }

        try {
            const updated = await updateRelease(
                repository._id,
                releaseId,
                payload
            );
            setRelease(updated);
            setEditing(false);
            setMessageType("success");
            setMessage("Release updated");
        } catch (saveError) {
            setMessageType("error");
            setMessage(
                saveError.response?.data?.message ||
                "Failed to update release"
            );
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        setMessage("");
        setMessageType("");

        try {
            const updated = await updateRelease(
                repository._id,
                releaseId,
                { status: "published" }
            );
            setRelease(updated);
            setEditing(false);
            setMessageType("success");
            setMessage("Release published");
        } catch (publishError) {
            setMessageType("error");
            setMessage(
                publishError.response?.data?.message ||
                "Failed to publish release"
            );
        } finally {
            setPublishing(false);
        }
    };

    if (loading) {
        return <p>Loading release...</p>;
    }

    if (error) {
        return <p className="commit-error">{error}</p>;
    }

    if (!release) {
        return <p className="commit-empty">Release not found.</p>;
    }

    const isDraft = release.status === "draft";

    return (
        <div className="release-detail">
            <button
                className="file-viewer-back"
                onClick={onBack}
            >
                Back to releases
            </button>

            <div className="release-detail-header">
                <div className="release-detail-title-row">
                    <h3>{release.title}</h3>
                    <span
                        className={`release-status release-status-${release.status}`}
                    >
                        {release.status}
                    </span>
                </div>
                <p>
                    <span className="release-tag-badge">
                        {release.tagName}
                    </span>{" "}
                    · {release.author?.userName || "Unknown"} ·{" "}
                    {isDraft
                        ? `Created ${formatDate(release.createdAt)}`
                        : `Published ${formatDate(release.publishedAt)}`}
                </p>
            </div>

            {message && (
                <p className={`commit-message ${messageType}`}>
                    {message}
                </p>
            )}

            <div className="release-commit-box">
                <div className="release-commit-row">
                    <span className="commit-row-id">
                        {release.commit ? shortId(release.commit.id) : ""}
                    </span>
                    <span className="commit-row-message">
                        {release.commit?.message || "Commit missing"}
                    </span>
                </div>
                <div className="release-commit-meta">
                    <span>
                        {release.commit?.author?.name || "Unknown"}
                    </span>
                    <span>
                        {formatFullDate(release.commit?.timestamp)}
                    </span>
                    {release.commitId && (
                        <span className="commit-id">
                            {release.commitId}
                        </span>
                    )}
                </div>
            </div>

            {isOwner && (
                <div className="release-actions">
                    {isDraft ? (
                        <>
                            <button
                                className="commit-submit-btn"
                                onClick={startEditing}
                            >
                                Edit release
                            </button>
                            <button
                                className="release-publish-btn"
                                onClick={handlePublish}
                                disabled={publishing}
                            >
                                {publishing
                                    ? "Publishing..."
                                    : "Publish release"}
                            </button>
                        </>
                    ) : (
                        <button
                            className="commit-submit-btn"
                            onClick={startEditing}
                        >
                            Edit release
                        </button>
                    )}
                </div>
            )}

            {editing && (
                <div className="release-edit-form">
                    <h4>Edit release</h4>
                    <input
                        className="release-title-input"
                        type="text"
                        placeholder="Title"
                        value={editForm.title}
                        onChange={(e) =>
                            setEditForm({
                                ...editForm,
                                title: e.target.value
                            })
                        }
                        maxLength={200}
                    />
                    <textarea
                        className="release-notes-input"
                        placeholder="Release notes"
                        value={editForm.description}
                        onChange={(e) =>
                            setEditForm({
                                ...editForm,
                                description: e.target.value
                            })
                        }
                        rows={5}
                    />
                    {isDraft && (
                        <label className="release-tag-select">
                            Tag
                            <select
                                value={editForm.tagName}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        tagName: e.target.value
                                    })
                                }
                            >
                                {tags.length === 0 && (
                                    <option value="">
                                        No tags available
                                    </option>
                                )}
                                {tags.map((tag) => (
                                    <option
                                        key={tag.name}
                                        value={tag.name}
                                    >
                                        {tag.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <button
                        className="commit-submit-btn"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </div>
            )}

            <div className="release-notes">
                <h4>Release notes</h4>
                {release.description ? (
                    <pre className="release-notes-text">
                        {release.description}
                    </pre>
                ) : (
                    <p className="commit-empty">No release notes.</p>
                )}
            </div>

            <div className="release-changes">
                <h4>
                    Changes since{" "}
                    {release.previousTagName
                        ? `tag ${release.previousTagName}`
                        : "the beginning"}
                </h4>
                {release.changesSincePreviousTag?.length === 0 && (
                    <p className="commit-empty">
                        No commits since the previous tag.
                    </p>
                )}
                {release.changesSincePreviousTag?.length > 0 && (
                    <div className="commit-list">
                        {release.changesSincePreviousTag.map((commit) => (
                            <div
                                key={commit.id}
                                className="commit-row release-change-row"
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReleaseDetails;
