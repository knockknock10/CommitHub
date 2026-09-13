import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/dashboard/DashboardLayout";
import StateBlock from "../components/ui/StateBlock";
import {
    PullRequestIcon,
    GitMergeIcon,
    BranchIcon,
    MessageIcon,
    SearchIcon,
    CloseIcon
} from "../components/ui/icons";
import { fetchRepositories, fetchCollaboratingRepositories, fetchPullRequests } from "../api/repositoryApi";

import "../styles/pullRequests.css";

const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
};

const PullRequests = () => {
    const navigate = useNavigate();

    const [allPRs, setAllPRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const loadAllPRs = async () => {
        setLoading(true);
        setError("");
        try {
            const [repos, collaborating] = await Promise.all([
                fetchRepositories(),
                fetchCollaboratingRepositories(),
            ]);
            const visibleRepos = [
                ...repos,
                ...collaborating.filter(
                    (repo) => !repos.some((r) => r._id === repo._id)
                ),
            ];
            const prArrays = await Promise.all(
                visibleRepos.map(async (repo) => {
                    try {
                        const data = await fetchPullRequests(repo._id, {});
                        return (data.pullRequests || []).map((pr) => ({
                            ...pr,
                            repoName: repo.name,
                            repoId: repo._id
                        }));
                    } catch {
                        return [];
                    }
                })
            );
            setAllPRs(prArrays.flat());
        } catch {
            setError("Failed to load pull requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllPRs();
    }, []);

    const isFiltering = search.trim() !== "" || filter !== "all";

    const filteredPullRequests = allPRs.filter((pr) => {
        const matchesSearch =
            pr.title.toLowerCase().includes(search.toLowerCase()) ||
            (pr.repoName || "").toLowerCase().includes(search.toLowerCase()) ||
            (pr.sourceBranch || "").toLowerCase().includes(search.toLowerCase());

        const matchesFilter = filter === "all" || pr.status === filter;

        return matchesSearch && matchesFilter;
    });

    const openCount = allPRs.filter((pr) => pr.status === "open").length;
    const mergedCount = allPRs.filter((pr) => pr.status === "merged").length;
    const closedCount = allPRs.filter((pr) => pr.status === "closed").length;

    return (
        <DashboardLayout>
            <div className="pull-requests-page">
                <div className="pr-header">
                    <div>
                        <h1>Pull Requests</h1>
                        <p className="dashboard-header-sub">
                            Review, merge, and manage contribution flow.
                        </p>
                    </div>
                </div>

                <div className="pr-filters">
                    <div className="repositories-search">
                        <SearchIcon
                            className="repositories-search-icon"
                            size={14}
                        />
                        <input
                            type="text"
                            placeholder="Search pull requests..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search pull requests"
                        />
                    </div>

                    <button
                        className={`pr-filter-btn ${
                            filter === "all" ? "active" : ""
                        }`}
                        onClick={() => setFilter("all")}
                    >
                        All
                        <span className="issues-filter-count">
                            {allPRs.length}
                        </span>
                    </button>
                    <button
                        className={`pr-filter-btn ${
                            filter === "open" ? "active" : ""
                        }`}
                        onClick={() => setFilter("open")}
                    >
                        <PullRequestIcon size={13} />
                        Open
                        <span className="issues-filter-count">
                            {openCount}
                        </span>
                    </button>
                    <button
                        className={`pr-filter-btn ${
                            filter === "merged" ? "active" : ""
                        }`}
                        onClick={() => setFilter("merged")}
                    >
                        <GitMergeIcon size={13} />
                        Merged
                        <span className="issues-filter-count">
                            {mergedCount}
                        </span>
                    </button>
                    <button
                        className={`pr-filter-btn ${
                            filter === "closed" ? "active" : ""
                        }`}
                        onClick={() => setFilter("closed")}
                    >
                        <CloseIcon size={13} />
                        Closed
                        <span className="issues-filter-count">
                            {closedCount}
                        </span>
                    </button>
                </div>

                {loading && (
                    <StateBlock
                        variant="loading"
                        message="Loading pull requests..."
                    />
                )}

                {error && (
                    <StateBlock
                        variant="error"
                        message={error}
                        retry={loadAllPRs}
                    />
                )}

                {!loading && !error && (
                    <div className="pr-list">
                        <div className="pr-list-header">
                            <span />
                            <span>Pull Request</span>
                            <span>Author</span>
                            <span>Updated</span>
                        </div>

                        {filteredPullRequests.length === 0 && (
                            isFiltering ? (
                                <StateBlock
                                    variant="empty"
                                    message="No pull requests found matching your search or filter."
                                    action={{
                                        label: "Clear filters",
                                        onClick: () => {
                                            setSearch("");
                                            setFilter("all");
                                        }
                                    }}
                                />
                            ) : (
                                <StateBlock
                                    variant="empty"
                                    message="No pull requests yet. Propose changes to repositories here."
                                    action={{
                                        label: "Open a repository",
                                        onClick: () =>
                                            navigate("/repositories")
                                    }}
                                />
                            )
                        )}

                        {filteredPullRequests.map((pr) => (
                            <div
                                className="pr-item"
                                key={pr._id}
                                onClick={() =>
                                    navigate(
                                        `/repository/${pr.repoId}/pull-request/${pr.number}`
                                    )
                                }
                                role="link"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        navigate(
`/repository/${pr.repoId}/pull-request/${pr.number}`
                                        );
                                    }
                                }}
                            >
                                <span
                                    className={`pr-item-icon ${pr.status}`}
                                >
                                    {pr.status === "open" && (
                                        <PullRequestIcon size={15} />
                                    )}
                                    {pr.status === "merged" && (
                                        <GitMergeIcon size={15} />
                                    )}
                                    {pr.status === "closed" && (
                                        <CloseIcon size={15} />
                                    )}
                                </span>
                                <div className="pr-item-body">
                                    <span className="pr-item-title">
                                        {pr.title}
                                    </span>
                                    <span className="pr-item-branches">
                                        #{pr.number}
                                        <BranchIcon size={11} />
                                        <span className="mono">
                                            {pr.sourceBranch}
                                        </span>
                                        <span className="arrow">→</span>
                                        <span className="mono">
                                            {pr.targetBranch}
                                        </span>
                                        <span className="arrow">·</span>
                                        {pr.repoName}
                                    </span>
                                </div>
                                <span className="pr-item-author">
                                    {pr.author?.userName || "unknown"}
                                </span>
                                <span className="pr-item-updated">
                                    <MessageIcon size={12} />
                                    {pr.reviews?.length || 0} ·{" "}
                                    {formatDate(pr.createdAt)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default PullRequests;