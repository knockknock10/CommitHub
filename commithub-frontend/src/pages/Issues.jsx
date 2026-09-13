import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/dashboard/DashboardLayout";
import StateBlock from "../components/ui/StateBlock";
import { IssueIcon, CheckIcon, MessageIcon, SearchIcon } from "../components/ui/icons";
import { fetchRepositories, fetchCollaboratingRepositories } from "../api/repositoryApi";
import { getIssues } from "../api/issueApi";

import "../styles/issues.css";

const Issues = () => {
    const navigate = useNavigate();

    const [allIssues, setAllIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const loadAllIssues = async () => {
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
            const issueArrays = await Promise.all(
                visibleRepos.map(async (repo) => {
                    try {
                        const data = await getIssues(repo._id);
                        return (data.issues || []).map((issue) => ({
                            ...issue,
                            repoName: repo.name,
                            repoId: repo._id
                        }));
                    } catch {
                        return [];
                    }
                })
            );
            setAllIssues(issueArrays.flat());
        } catch {
            setError("Failed to load issues");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllIssues();
    }, []);

    const isFiltering = search.trim() !== "" || filter !== "all";

    const filteredIssues = allIssues.filter((issue) => {
        const matchesSearch =
            issue.title.toLowerCase().includes(search.toLowerCase()) ||
            (issue.repoName || "")
                .toLowerCase()
                .includes(search.toLowerCase()) ||
            (issue.label || "")
                .toLowerCase()
                .includes(search.toLowerCase());

        const matchesFilter =
            filter === "all" || issue.status === filter;

        return matchesSearch && matchesFilter;
    });

    const openCount = allIssues.filter(
        (issue) => issue.status === "open"
    ).length;

    const closedCount = allIssues.filter(
        (issue) => issue.status === "closed"
    ).length;

    const labelClass = (label) => {
        const l = (label || "").toLowerCase();
        if (l.includes("bug")) return "bug";
        if (l.includes("feature")) return "feature";
        if (l.includes("enhance")) return "enhancement";
        if (l.includes("doc")) return "documentation";
        return "";
    };

    return (
        <DashboardLayout>
            <div className="issues-page">
                <div className="issues-header">
                    <div>
                        <h1>Issues</h1>
                        <p className="dashboard-header-sub">
                            Track bugs, feature requests, and tasks across
                            your repositories.
                        </p>
                    </div>
                </div>

                <div className="issues-filters">
                    <div className="repositories-search">
                        <SearchIcon
                            className="repositories-search-icon"
                            size={14}
                        />
                        <input
                            type="text"
                            placeholder="Search issues..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search issues"
                        />
                    </div>

                    <button
                        className={`issues-filter-btn ${
                            filter === "all" ? "active" : ""
                        }`}
                        onClick={() => setFilter("all")}
                    >
                        All
                        <span className="issues-filter-count">
                            {allIssues.length}
                        </span>
                    </button>
                    <button
                        className={`issues-filter-btn ${
                            filter === "open" ? "active" : ""
                        }`}
                        onClick={() => setFilter("open")}
                    >
                        <IssueIcon size={13} />
                        Open
                        <span className="issues-filter-count">
                            {openCount}
                        </span>
                    </button>
                    <button
                        className={`issues-filter-btn ${
                            filter === "closed" ? "active" : ""
                        }`}
                        onClick={() => setFilter("closed")}
                    >
                        <CheckIcon size={13} />
                        Closed
                        <span className="issues-filter-count">
                            {closedCount}
                        </span>
                    </button>
                </div>

                {loading && (
                    <StateBlock variant="loading" message="Loading issues..." />
                )}

                {error && (
                    <StateBlock
                        variant="error"
                        message={error}
                        retry={loadAllIssues}
                    />
                )}

                {!loading && !error && (
                    <div className="issue-list">
                        <div className="issue-list-header">
                            <span />
                            <span>Issue</span>
                            <span>Author</span>
                            <span>Assignee</span>
                            <span>Updated</span>
                        </div>

                        {filteredIssues.length === 0 && (
                            isFiltering ? (
                                <StateBlock
                                    variant="empty"
                                    message="No issues found matching your search or filter."
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
                                    message="No issues yet. Track bugs, feature requests, and tasks here."
                                    action={{
                                        label: "Open a repository",
                                        onClick: () =>
                                            navigate("/repositories")
                                    }}
                                />
                            )
                        )}

                        {filteredIssues.map((issue) => (
                            <div
                                className="issue-item"
                                key={issue._id}
                                onClick={() => navigate(`/issues/${issue._id}`)}
                                role="link"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        navigate(`/issues/${issue._id}`);
                                    }
                                }}
                            >
                                <span
                                    className={`issue-item-icon ${
                                        issue.status === "open"
                                            ? "open"
                                            : "closed"
                                    }`}
                                >
                                    {issue.status === "open" ? (
                                        <IssueIcon size={15} />
                                    ) : (
                                        <CheckIcon size={15} />
                                    )}
                                </span>
                                <div className="issue-item-body">
                                    <span className="issue-item-title">
                                        {issue.title}
                                    </span>
                                    <div className="issue-item-labels">
                                        {issue.label && (
                                            <span
                                                className={`issue-label ${labelClass(
                                                    issue.label
                                                )}`}
                                            >
                                                {issue.label}
                                            </span>
                                        )}
                                        <span className="issue-item-sub">
                                            {issue.repoName} · # opening{" "}
                                        </span>
                                    </div>
                                </div>
                                <span className="issue-item-author">
                                    {issue.author?.userName || "unknown"}
                                </span>
                                <span className="issue-item-assignee">
                                    {issue.assignee?.userName || "—"}
                                </span>
                                <span className="issue-item-updated">
                                    <MessageIcon size={12} />
                                    {issue.comments?.length || 0} ·{" "}
                                    {new Date(
                                        issue.createdAt
                                    ).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Issues;