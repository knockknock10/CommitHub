import { useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/dashboard/DashboardLayout";

import "../styles/repositories.css";

const repoData = [

    {
        name: "commithub-frontend",
        visibility: "public",
        description: "frontend interface for authentication, dashboard, repository pages, and user workflows.",
        language: "javascript",
        stars: 12,
        forks: 3,
        issues: 4,
        updated: "updated 2 hours ago"
    },

    {
        name: "commithub-backend",
        visibility: "private",
        description: "backend api for authentication, repositories, commits, branches, remotes, and issues.",
        language: "node.js",
        stars: 8,
        forks: 2,
        issues: 2,
        updated: "updated 35 minutes ago"
    },

    {
        name: "aws-storage-service",
        visibility: "private",
        description: "aws s3 upload service for repository assets and cloud file storage.",
        language: "javascript",
        stars: 5,
        forks: 1,
        issues: 1,
        updated: "updated yesterday"
    },

    {
        name: "commit-engine",
        visibility: "public",
        description: "core commit workflow logic for tracking file changes and repository history.",
        language: "node.js",
        stars: 18,
        forks: 5,
        issues: 6,
        updated: "updated 3 days ago"
    }
];

const Repositories = () => {

    const navigate = useNavigate();

    const [search, setSearch] = useState("");

    const [filter, setFilter] = useState("all");

    const filteredRepos = repoData.filter((repo) => {

        const matchesSearch =
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        repo.description.toLowerCase().includes(search.toLowerCase());

        const matchesFilter =
        filter === "all" || repo.visibility === filter;

        return matchesSearch && matchesFilter;
    });

    return (

        <DashboardLayout>

            <div className="repositories-page">

                <div className="repositories-header">

                    <div>

                        <h1>
                            Repositories
                        </h1>

                        <p>
                            Browse, search, and manage your project repositories.
                        </p>

                    </div>

                    <button className="create-repo-btn">
                        New repository
                    </button>

                </div>

                <div className="repo-tools">

                    <input
                        type="text"
                        placeholder="Find a repository..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <div className="repo-filters">

                        <button
                            className={filter === "all" ? "active-filter" : ""}
                            onClick={() => setFilter("all")}
                        >
                            all
                        </button>

                        <button
                            className={filter === "public" ? "active-filter" : ""}
                            onClick={() => setFilter("public")}
                        >
                            public
                        </button>

                        <button
                            className={filter === "private" ? "active-filter" : ""}
                            onClick={() => setFilter("private")}
                        >
                            private
                        </button>

                    </div>

                </div>

                <div className="repo-count">

                    {filteredRepos.length} repositories found

                </div>

                <div className="repositories-list">

                    {filteredRepos.map((repo, index) => (

                        <div
                            className="repository-row"
                            key={index}
                        >

                            <div className="repository-main">

                                <div className="repository-title-row">

                                    <h2>
                                        {repo.name}
                                    </h2>

                                    <span className={repo.visibility}>
                                        {repo.visibility}
                                    </span>

                                </div>

                                <p>
                                    {repo.description}
                                </p>

                                <div className="repository-meta">

                                    <span>
                                        {repo.language}
                                    </span>

                                    <span>
                                        ★ {repo.stars}
                                    </span>

                                    <span>
                                        forks {repo.forks}
                                    </span>

                                    <span>
                                        issues {repo.issues}
                                    </span>

                                    <span>
                                        {repo.updated}
                                    </span>

                                </div>

                            </div>

                            <button
                                className="repo-action-btn"
                                onClick={() => navigate(`/repositories/${repo.name}`)}
                            >
                                open
                            </button>

                        </div>

                    ))}

                </div>

            </div>

        </DashboardLayout>
    );
};

export default Repositories;