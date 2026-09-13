import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    PullRequestIcon,
    GitMergeIcon,
    CloseIcon,
    PlusIcon,
    BranchIcon
} from "../ui/icons";
import {
    fetchPullRequests,
    createPullRequest
} from "../../api/repositoryApi";
import PullRequestDetails from "./PullRequestDetails";
import "../../styles/pullRequestComponents.css";

const PullRequestList = ({ repository, isOwner, initialNumber }) => {
    const [prs, setPrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("open");
    const [showForm, setShowForm] = useState(false);

    const defaultBranches = () => {
        const branches = repository?.branches || [];
        if (branches.length === 0) return { sourceBranch: "", targetBranch: "" };
        if (branches.length === 1) {
            return { sourceBranch: branches[0], targetBranch: branches[0] };
        }
        const target =
            branches.find((b) => b === "main") || branches[0];
        const source = branches.find((b) => b !== target) || branches[1];
        return { sourceBranch: source, targetBranch: target };
    };

    const [form, setForm] = useState({
        title: "",
        description: "",
        ...defaultBranches()
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const loadPRs = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchPullRequests(repository._id, {});
            setPrs(data.pullRequests || []);
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to load pull requests"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPRs();
    }, [repository._id]);

    const openCount = prs.filter((pr) => pr.status === "open").length;
    const closedCount = prs.filter((pr) => pr.status === "closed").length;
    const mergedCount = prs.filter((pr) => pr.status === "merged").length;

    const visiblePRs = prs.filter(
        (pr) => filter === "all" || pr.status === filter
    );

    const resetForm = () => {
        setForm({
            title: "",
            description: "",
            ...defaultBranches()
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            setCreateError("Title is required");
            return;
        }
        if (!form.sourceBranch || !form.targetBranch) {
            setCreateError("Source and target branches are required");
            return;
        }
        if (form.sourceBranch === form.targetBranch) {
            setCreateError("Source and target branches must be different");
            return;
        }
        setCreating(true);
        setCreateError("");
        try {
            await createPullRequest(repository._id, {
                title: form.title.trim(),
                description: form.description.trim(),
                sourceBranch: form.sourceBranch,
                targetBranch: form.targetBranch
            });
            resetForm();
            setShowForm(false);
            await loadPRs();
        } catch (err) {
            setCreateError(
                err.response?.data?.message || "Failed to create pull request"
            );
        } finally {
            setCreating(false);
        }
    };

    if (initialNumber) {
        return (
            <PullRequestDetails
                repository={repository}
                isOwner={isOwner}
            />
        );
    }

    const branches = repository?.branches || [];

    return (
        <div className="gh-pr-container">
            <div className="gh-pr-toolbar">
                <div className="gh-pr-tabs">
                    <button
                        className={`gh-pr-tab ${filter === 'open' ? 'active' : ''}`}
                        onClick={() => setFilter('open')}
                    >
                        <PullRequestIcon size={13} /> Open {openCount}
                    </button>
                    <button
                        className={`gh-pr-tab ${filter === 'closed' ? 'active' : ''}`}
                        onClick={() => setFilter('closed')}
                    >
                        <CloseIcon size={13} /> Closed {closedCount}
                    </button>
                    <button
                        className={`gh-pr-tab ${filter === 'merged' ? 'active' : ''}`}
                        onClick={() => setFilter('merged')}
                    >
                        <GitMergeIcon size={13} /> Merged {mergedCount}
                    </button>
                </div>
                <div className="gh-pr-actions">
                    <button
                        className="gh-pr-new-btn"
                        onClick={() => setShowForm((prev) => !prev)}
                    >
                        <PlusIcon size={14} /> {showForm ? "Close" : "New pull request"}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="gh-pr-create-wrap">
                    <form className="gh-pr-create-form" onSubmit={handleCreate}>
                        <h3>New pull request</h3>
                        <div className="gh-pr-create-branches">
                            <label>
                                <span>From</span>
                                <select
                                    value={form.sourceBranch}
                                    onChange={(e) =>
                                        setForm({ ...form, sourceBranch: e.target.value })
                                    }
                                    className="gh-pr-branch-select"
                                >
                                    {branches.map((b) => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </label>
                            <span className="gh-pr-branch-arrow">→</span>
                            <label>
                                <span>Into</span>
                                <select
                                    value={form.targetBranch}
                                    onChange={(e) =>
                                        setForm({ ...form, targetBranch: e.target.value })
                                    }
                                    className="gh-pr-branch-select"
                                >
                                    {branches.map((b) => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <input
                            className="gh-pr-title-input"
                            type="text"
                            placeholder="Pull request title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                        <textarea
                            className="gh-pr-desc-input"
                            placeholder="Describe your changes..."
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                        {createError && <p className="gh-pr-form-error">{createError}</p>}
                        <div className="gh-pr-form-actions">
                            <button
                                type="submit"
                                className="gh-pr-submit-btn"
                                disabled={creating}
                            >
                                {creating ? "Creating..." : "Create pull request"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading && <div className="shared-loading"><p>Loading pull requests...</p></div>}
            {error && <div className="shared-error"><p>{error}</p></div>}

            {!loading && !error && (
                <div className="gh-pr-list">
                    {visiblePRs.length === 0 ? (
                        <div className="shared-empty-state">
                            <p>No {filter} pull requests found.</p>
                        </div>
                    ) : (
                        visiblePRs.map((pr) => (
                            <div className="gh-pr-item" key={pr._id}>
                                <div className="gh-pr-item-left">
                                    <div className={`gh-pr-status-icon ${pr.status}`}>
                                        {pr.status === "merged" ? (
                                            <GitMergeIcon size={16} />
                                        ) : pr.status === "closed" ? (
                                            <CloseIcon size={16} />
                                        ) : (
                                            <PullRequestIcon size={16} />
                                        )}
                                    </div>
                                    <div className="gh-pr-info">
                                        <Link
                                            to={`/repository/${repository._id}/pull-request/${pr.number}`}
                                            className="gh-pr-title"
                                        >
                                            {pr.title}
                                        </Link>
                                        <div className="gh-pr-meta">
                                            <span className="gh-pr-meta-item">#{pr.number}</span>
                                            <span className="gh-pr-meta-item">
                                                <BranchIcon size={11} /> {pr.sourceBranch} → {pr.targetBranch}
                                            </span>
                                            <span className="gh-pr-meta-item">
                                                opened by {pr.author?.userName || "unknown"}
                                            </span>
                                            <span className="gh-pr-meta-item">
                                                {new Date(pr.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default PullRequestList;