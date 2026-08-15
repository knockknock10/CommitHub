import { useEffect, useState } from "react";
import {
    createPullRequest,
    fetchPullRequests
} from "../../api/repositoryApi";
import PullRequestDetails from "./PullRequestDetails";

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

const PullRequestList = ({ repository, isOwner }) => {
    const [reload, setReload] = useState(false);
    const [pullRequests, setPullRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("open");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        sourceBranch: repository.branches?.[1] || "",
        targetBranch: repository.branches?.[0] || "main",
        title: "",
        description: ""
    });
    const [selectedNumber, setSelectedNumber] = useState(null);

    useEffect(() => {
        const loadPullRequests = async () => {
            setLoading(true);
            setMessage("");
            setMessageType("");

            try {
                const data = await fetchPullRequests(
                    repository._id,
                    { status: filter }
                );
                setPullRequests(data.pullRequests || []);
            } catch (error) {
                setMessageType("error");
                setMessage(
                    error.response?.data?.message ||
                    "Failed to load pull requests"
                );
            } finally {
                setLoading(false);
            }
        };
        loadPullRequests();
    }, [repository._id, filter, reload]);

    const branches = repository.branches || [];

    const handleCreate = async () => {
        if (createForm.title.trim() === "") {
            setMessageType("error");
            setMessage("Title is required");
            return;
        }

        if (
            createForm.sourceBranch === "" ||
            createForm.targetBranch === ""
        ) {
            setMessageType("error");
            setMessage("Source and target branches are required");
            return;
        }

        if (createForm.sourceBranch === createForm.targetBranch) {
            setMessageType("error");
            setMessage("Source and target branches must be different");
            return;
        }

        setCreating(true);
        setMessage("");
        setMessageType("");

        try {
            const created = await createPullRequest(
                repository._id,
                {
                    sourceBranch: createForm.sourceBranch,
                    targetBranch: createForm.targetBranch,
                    title: createForm.title.trim(),
                    description: createForm.description.trim()
                }
            );
            setShowCreate(false);
            setCreateForm({
                sourceBranch: branches[1] || "",
                targetBranch: branches[0] || "main",
                title: "",
                description: ""
            });
            setSelectedNumber(created.number);
        } catch (error) {
            setMessageType("error");
            setMessage(
                error.response?.data?.message ||
                "Failed to create pull request"
            );
        } finally {
            setCreating(false);
        }
    };

    if (selectedNumber) {
        return (
            <PullRequestDetails
                repository={repository}
                isOwner={isOwner}
                number={selectedNumber}
                onBack={() => {
                    setSelectedNumber(null);
                    setReload((prev) => !prev);
                }}
            />
        );
    }

    return (
        <div className="pull-requests-view">
            <div className="pull-requests-header">
                <h3>Pull requests</h3>
                {isOwner && (
                    <button
                        className="pull-request-new-btn"
                        onClick={() => setShowCreate((prev) => !prev)}
                    >
                        {showCreate ? "Cancel" : "New pull request"}
                    </button>
                )}
            </div>

            {showCreate && (
                <div className="pull-request-create">
                    <h4>Create pull request</h4>
                    <div className="pull-request-create-form">
                        <div className="pull-request-create-row">
                            <label>
                                Source branch
                                <select
                                    value={createForm.sourceBranch}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            sourceBranch: e.target.value
                                        })
                                    }
                                >
                                    {branches.map((branch) => (
                                        <option
                                            key={branch}
                                            value={branch}
                                        >
                                            {branch}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Target branch
                                <select
                                    value={createForm.targetBranch}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            targetBranch: e.target.value
                                        })
                                    }
                                >
                                    {branches.map((branch) => (
                                        <option
                                            key={branch}
                                            value={branch}
                                        >
                                            {branch}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <input
                            className="pull-request-title-input"
                            type="text"
                            placeholder="Title"
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
                            className="pull-request-description-input"
                            placeholder="Description"
                            value={createForm.description}
                            onChange={(e) =>
                                setCreateForm({
                                    ...createForm,
                                    description: e.target.value
                                })
                            }
                            rows={4}
                        />
                        <button
                            className="commit-submit-btn"
                            onClick={handleCreate}
                            disabled={creating}
                        >
                            {creating
                                ? "Creating..."
                                : "Create pull request"}
                        </button>
                    </div>
                </div>
            )}

            {message && (
                <p className={`commit-message ${messageType}`}>
                    {message}
                </p>
            )}

            <div className="pull-request-filters">
                {["open", "closed", "merged"].map((state) => (
                    <button
                        key={state}
                        className={
                            filter === state
                                ? "pull-request-filter active"
                                : "pull-request-filter"
                        }
                        onClick={() => setFilter(state)}
                    >
                        {state.charAt(0).toUpperCase() + state.slice(1)}
                    </button>
                ))}
            </div>

            {loading && <p>Loading pull requests...</p>}

            {!loading && pullRequests.length === 0 && (
                <p className="commit-empty">No pull requests found.</p>
            )}

            {!loading && pullRequests.length > 0 && (
                <div className="pull-request-list">
                    {pullRequests.map((pullRequest) => (
                        <button
                            key={pullRequest.number}
                            className="pull-request-row"
                            onClick={() =>
                                setSelectedNumber(pullRequest.number)
                            }
                        >
                            <div className="pull-request-row-main">
                                <span className="pull-request-number">
                                    #{pullRequest.number}
                                </span>
                                <span className="pull-request-title">
                                    {pullRequest.title}
                                </span>
                            </div>
                            <div className="pull-request-row-meta">
                                <span className="pull-request-branches">
                                    {pullRequest.sourceBranch} →{" "}
                                    {pullRequest.targetBranch}
                                </span>
                                <span>
                                    {pullRequest.author?.userName || "Unknown"}
                                </span>
                                <span>
                                    {formatDate(pullRequest.createdAt)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PullRequestList;
