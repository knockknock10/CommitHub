import { useEffect, useState } from "react";
import {
    createRelease,
    createRepositoryTag,
    fetchReleases,
    fetchRepositoryTags,
    updateRelease
} from "../../api/repositoryApi";
import ReleaseDetails from "./ReleaseDetails";

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

const PAGE_SIZE = 10;

const ReleaseList = ({ repository, isOwner }) => {
    const [reload, setReload] = useState(false);
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [tags, setTags] = useState([]);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        tagChoice: "existing",
        tagName: "",
        newTagName: "",
        newTagCommitId: "",
        title: "",
        description: ""
    });
    const [selectedReleaseId, setSelectedReleaseId] = useState(null);

    useEffect(() => {
        const loadReleases = async () => {
            setLoading(true);
            setMessage("");
            setMessageType("");

            const params = { limit: PAGE_SIZE, page };

            if (filter !== "all") {
                params.status = filter;
            }

            try {
                const data = await fetchReleases(
                    repository._id,
                    params
                );
                setReleases(data.releases || []);
                setTotalPages(data.pages || 1);
            } catch (error) {
                setMessageType("error");
                setMessage(
                    error.response?.data?.message ||
                    "Failed to load releases"
                );
            } finally {
                setLoading(false);
            }
        };
        loadReleases();
    }, [repository._id, filter, page, reload]);

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
    }, [repository._id, isOwner, reload]);

    const handleCreate = async (publishAfter) => {
        let tagName = createForm.tagName;

        if (createForm.tagChoice === "new") {
            if (createForm.newTagName.trim() === "") {
                setMessageType("error");
                setMessage("New tag name is required");
                return;
            }

            tagName = createForm.newTagName.trim();
        }

        if (tagName === "") {
            setMessageType("error");
            setMessage("Choose a tag or create a new one");
            return;
        }

        if (createForm.title.trim() === "") {
            setMessageType("error");
            setMessage("Title is required");
            return;
        }

        setCreating(true);
        setMessage("");
        setMessageType("");

        try {
            if (createForm.tagChoice === "new") {
                await createRepositoryTag(repository._id, {
                    name: tagName,
                    ...(createForm.newTagCommitId.trim()
                        ? { commitId: createForm.newTagCommitId.trim() }
                        : {})
                });
            }

            const created = await createRelease(repository._id, {
                tagName,
                title: createForm.title.trim(),
                description: createForm.description.trim()
            });

            if (publishAfter) {
                await updateRelease(
                    repository._id,
                    created._id,
                    { status: "published" }
                );
            }

            setShowCreate(false);
            setCreateForm({
                tagChoice: "existing",
                tagName: "",
                newTagName: "",
                newTagCommitId: "",
                title: "",
                description: ""
            });
            setSelectedReleaseId(created._id);
        } catch (error) {
            setMessageType("error");
            setMessage(
                error.response?.data?.message ||
                "Failed to create release"
            );
        } finally {
            setCreating(false);
        }
    };

    const handleFilterChange = (nextFilter) => {
        setFilter(nextFilter);
        setPage(1);
    };

    if (selectedReleaseId) {
        return (
            <ReleaseDetails
                repository={repository}
                isOwner={isOwner}
                releaseId={selectedReleaseId}
                onBack={() => {
                    setSelectedReleaseId(null);
                    setReload((prev) => !prev);
                }}
            />
        );
    }

    return (
        <div className="releases-view">
            <div className="releases-header">
                <h3>Releases</h3>
                {isOwner && (
                    <button
                        className="release-new-btn"
                        onClick={() => setShowCreate((prev) => !prev)}
                    >
                        {showCreate ? "Cancel" : "New release"}
                    </button>
                )}
            </div>

            {showCreate && (
                <div className="release-create">
                    <h4>Create release</h4>

                    <div className="release-tag-choice">
                        <label>
                            <input
                                type="radio"
                                name="tagChoice"
                                checked={createForm.tagChoice === "existing"}
                                onChange={() =>
                                    setCreateForm({
                                        ...createForm,
                                        tagChoice: "existing"
                                    })
                                }
                            />
                            Use existing tag
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="tagChoice"
                                checked={createForm.tagChoice === "new"}
                                onChange={() =>
                                    setCreateForm({
                                        ...createForm,
                                        tagChoice: "new"
                                    })
                                }
                            />
                            Create new tag
                        </label>
                    </div>

                    {createForm.tagChoice === "existing" ? (
                        <label className="release-tag-select">
                            Tag
                            <select
                                value={createForm.tagName}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        tagName: e.target.value
                                    })
                                }
                            >
                                <option value="">
                                    {tags.length === 0
                                        ? "No tags yet"
                                        : "Choose a tag"}
                                </option>
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
                    ) : (
                        <>
                            <input
                                className="release-title-input"
                                type="text"
                                placeholder="New tag name (e.g. v1.0.0)"
                                value={createForm.newTagName}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        newTagName: e.target.value
                                    })
                                }
                            />
                            <input
                                className="release-title-input"
                                type="text"
                                placeholder="Commit ID (optional, defaults to current branch tip)"
                                value={createForm.newTagCommitId}
                                onChange={(e) =>
                                    setCreateForm({
                                        ...createForm,
                                        newTagCommitId: e.target.value
                                    })
                                }
                            />
                        </>
                    )}

                    <input
                        className="release-title-input"
                        type="text"
                        placeholder="Release title"
                        value={createForm.title}
                        onChange={(e) =>
                            setCreateForm({
                                ...createForm,
                                title: e.target.value
                            })
                        }
                        maxLength={200}
                    />
                    <textarea
                        className="release-notes-input"
                        placeholder="Release notes"
                        value={createForm.description}
                        onChange={(e) =>
                            setCreateForm({
                                ...createForm,
                                description: e.target.value
                            })
                        }
                        rows={5}
                    />
                    <div className="release-create-actions">
                        <button
                            className="commit-submit-btn"
                            onClick={() => handleCreate(false)}
                            disabled={creating}
                        >
                            {creating ? "Creating..." : "Save draft"}
                        </button>
                        <button
                            className="release-publish-btn"
                            onClick={() => handleCreate(true)}
                            disabled={creating}
                        >
                            {creating
                                ? "Creating..."
                                : "Save and publish"}
                        </button>
                    </div>
                </div>
            )}

            {message && (
                <p className={`commit-message ${messageType}`}>
                    {message}
                </p>
            )}

            <div className="release-filters">
                {["all", "draft", "published"].map((state) => (
                    <button
                        key={state}
                        className={
                            filter === state
                                ? "release-filter active"
                                : "release-filter"
                        }
                        onClick={() => handleFilterChange(state)}
                    >
                        {state.charAt(0).toUpperCase() + state.slice(1)}
                    </button>
                ))}
            </div>

            {loading && <p>Loading releases...</p>}

            {!loading && releases.length === 0 && (
                <p className="commit-empty">No releases found.</p>
            )}

            {!loading && releases.length > 0 && (
                <div className="release-list">
                    {releases.map((release) => (
                        <button
                            key={release._id}
                            className="release-row"
                            onClick={() =>
                                setSelectedReleaseId(release._id)
                            }
                        >
                            <div className="release-row-main">
                                <span className="release-row-title">
                                    {release.title}
                                </span>
                                <span
                                    className={`release-status release-status-${release.status}`}
                                >
                                    {release.status}
                                </span>
                            </div>
                            <div className="release-row-meta">
                                <span className="release-tag-badge">
                                    {release.tagName}
                                </span>
                                <span>
                                    {release.author?.userName || "Unknown"}
                                </span>
                                <span>
                                    {release.publishedAt
                                        ? formatDate(release.publishedAt)
                                        : formatDate(release.createdAt)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {!loading && totalPages > 1 && (
                <div className="release-pagination">
                    <button
                        className="release-filter"
                        disabled={page <= 1}
                        onClick={() => setPage((prev) => prev - 1)}
                    >
                        Previous
                    </button>
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        className="release-filter"
                        disabled={page >= totalPages}
                        onClick={() => setPage((prev) => prev + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReleaseList;
