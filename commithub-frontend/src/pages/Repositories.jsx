import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/dashboard/DashboardLayout";
import StateBlock from "../components/ui/StateBlock";
import { fetchRepositories } from "../api/repositoryApi";
import { useAuth } from "../context/AuthContext";
import {
    RepoIcon,
    StarIcon,
    ForkIcon,
    SearchIcon,
    PlusIcon
} from "../components/ui/icons";

import "../styles/repositories.css";

const startOfDay = (timestamp) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date;
};

const updatedLabel = (repo) => {
    const timestamp = repo.updatedAt || repo.createdAt;

    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
        return "Updated just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(seconds / 3600);

    if (hours < 24) {
        return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const dayDiff = Math.round(
        (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000
    );

    if (dayDiff === 1) {
        return "Updated yesterday";
    }

    if (dayDiff < 7) {
        return `Updated ${dayDiff} days ago`;
    }

    return `Updated on ${date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(date.getFullYear() !== now.getFullYear()
            ? { year: "numeric" }
            : {})
    })}`;
};

const RepoRow = ({ repo, ownerName, ownerId }) => {
    const navigate = useNavigate();
    const openRepo = () => navigate(`/repository/${repo._id}`);
    const stop = (e) => e.stopPropagation();

    return (
        <div
            className="repo-row"
            role="link"
            tabIndex={0}
            onClick={openRepo}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRepo();
                }
            }}
        >
            <span className="repo-row-icon" aria-hidden="true">
                <RepoIcon size={16} />
            </span>

            <div className="repo-row-main">
                <div className="repo-row-title">
                    {ownerId ? (
                        <Link
                            to={`/profile/${ownerId}`}
                            className="repo-row-owner"
                            onClick={stop}
                        >
                            {ownerName}
                        </Link>
                    ) : (
                        <span className="repo-row-owner">{ownerName}</span>
                    )}
                    <span className="repo-row-slash" aria-hidden="true">
                        /
                    </span>
                    <Link
                        to={`/repository/${repo._id}`}
                        className="repo-row-name"
                        onClick={stop}
                    >
                        {repo.name}
                    </Link>
                    <span
                        className={`repo-row-visibility ${repo.visibility}`}
                    >
                        {repo.visibility === "private" ? "Private" : "Public"}
                    </span>
                </div>

                {repo.description && (
                    <p className="repo-row-desc">{repo.description}</p>
                )}

                <div className="repo-row-meta">
                    <span className="repo-row-stat">
                        <StarIcon size={12} />
                        {repo.stars || 0}
                    </span>
                    <span className="repo-row-stat">
                        <ForkIcon size={12} />
                        {repo.forks || 0}
                    </span>
                    <span className="repo-row-meta-dot" aria-hidden="true">
                        ·
                    </span>
                    <span className="repo-row-updated">
                        {updatedLabel(repo)}
                    </span>
                </div>
            </div>
        </div>
    );
};

const Repositories = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [repositories, setRepositories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const loadRepositories = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchRepositories();
            setRepositories(data);
        } catch {
            setError("Unable to load repositories.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRepositories();
    }, []);

    const isFiltering = search.trim() !== "" || filter !== "all";

    const filteredRepos = repositories.filter((repo) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
            query === "" ||
            repo.name.toLowerCase().includes(query) ||
            (repo.description || "").toLowerCase().includes(query);
        const matchesFilter =
            filter === "all" || repo.visibility === filter;

        return matchesSearch && matchesFilter;
    });

    const publicCount = repositories.filter(
        (repo) => repo.visibility === "public"
    ).length;
    const privateCount = repositories.length - publicCount;

    const ownerId = user?._id;
    const ownerName = user?.userName || "you";

    return (
        <DashboardLayout>
            <div className="repositories-page">
                <header className="repositories-header">
                    <div>
                        <h1 className="repositories-title">
                            Your repositories
                        </h1>
                        <p className="repositories-subtitle">
                            Repositories you own, organize, and share.
                        </p>
                    </div>

                    <button
                        className="btn primary"
                        onClick={() => navigate("/new")}
                    >
                        <PlusIcon size={14} />
                        New repository
                    </button>
                </header>

                <div className="repositories-toolbar">
                    <div className="repositories-search">
                        <SearchIcon
                            className="repositories-search-icon"
                            size={14}
                        />
                        <input
                            type="text"
                            placeholder="Find a repository..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search repositories"
                        />
                    </div>

                    <div
                        className="repositories-filters"
                        role="tablist"
                        aria-label="Filter repositories"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={filter === "all"}
                            className={`repositories-filter ${
                                filter === "all" ? "active" : ""
                            }`}
                            onClick={() => setFilter("all")}
                        >
                            All
                            <span className="repositories-filter-count">
                                {repositories.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={filter === "public"}
                            className={`repositories-filter ${
                                filter === "public" ? "active" : ""
                            }`}
                            onClick={() => setFilter("public")}
                        >
                            Public
                            <span className="repositories-filter-count">
                                {publicCount}
                            </span>
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={filter === "private"}
                            className={`repositories-filter ${
                                filter === "private" ? "active" : ""
                            }`}
                            onClick={() => setFilter("private")}
                        >
                            Private
                            <span className="repositories-filter-count">
                                {privateCount}
                            </span>
                        </button>
                    </div>
                </div>

                {loading && (
                    <StateBlock
                        variant="loading"
                        message="Loading repositories..."
                    />
                )}

                {error && (
                    <StateBlock
                        variant="error"
                        message={error}
                        retry={loadRepositories}
                    />
                )}

                {!loading && !error && (
                    <>
                        {filteredRepos.length === 0 ? (
                            isFiltering ? (
                                <StateBlock
                                    variant="empty"
                                    message="No repositories found matching your search or filter."
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
                                    message="You don't have any repositories yet. Create your first repository."
                                    action={{
                                        label: "New repository",
                                        onClick: () => navigate("/new")
                                    }}
                                />
                            )
                        ) : (
                            <div className="repository-list">
                                {filteredRepos.map((repo) => (
                                    <RepoRow
                                        key={repo._id}
                                        repo={repo}
                                        ownerId={ownerId}
                                        ownerName={ownerName}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Repositories;