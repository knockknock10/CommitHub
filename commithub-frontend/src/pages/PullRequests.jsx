import { useState } from "react";

import DashboardLayout from "../components/dashboard/DashboardLayout";

import "../styles/pullRequests.css";

const pullRequestData = [

    {
        id: 24,
        title: "add repository details page",
        branch: "feature/repository-page",
        status: "open",
        author: "sanjeev",
        comments: 5,
        commits: 12,
        updated: "updated 18 minutes ago"
    },

    {
        id: 19,
        title: "improve dashboard repository cards",
        branch: "feature/dashboard-ui",
        status: "merged",
        author: "sanjeev",
        comments: 3,
        commits: 7,
        updated: "merged yesterday"
    },

    {
        id: 16,
        title: "connect authentication context",
        branch: "feature/auth-context",
        status: "open",
        author: "sanjeev",
        comments: 2,
        commits: 9,
        updated: "updated 2 hours ago"
    },

    {
        id: 11,
        title: "aws s3 upload integration",
        branch: "feature/aws-storage",
        status: "merged",
        author: "sanjeev",
        comments: 8,
        commits: 14,
        updated: "merged 3 days ago"
    }
];

const PullRequests = () => {

    const [search, setSearch] = useState("");

    const [filter, setFilter] = useState("all");

    const filteredPullRequests =
    pullRequestData.filter((pr) => {

        const matchesSearch =
        pr.title.toLowerCase().includes(search.toLowerCase()) ||
        pr.branch.toLowerCase().includes(search.toLowerCase());

        const matchesFilter =
        filter === "all" || pr.status === filter;

        return matchesSearch && matchesFilter;
    });

    const openCount =
    pullRequestData.filter((pr) =>
        pr.status === "open"
    ).length;

    const mergedCount =
    pullRequestData.filter((pr) =>
        pr.status === "merged"
    ).length;

    return (

        <DashboardLayout>

            <div className="pull-page">

                <div className="pull-header">

                    <div>

                        <h1>
                            Pull Requests
                        </h1>

                        <p>
                            Review, merge, and manage repository contributions.
                        </p>

                    </div>

                    <button className="new-pr-btn">
                        New pull request
                    </button>

                </div>

                <div className="pull-toolbar">

                    <input
                        type="text"
                        placeholder="Search pull requests..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                    <div className="pull-filters">

                        <button
                            className={
                                filter === "all"
                                ? "active-pr-filter"
                                : ""
                            }
                            onClick={() => setFilter("all")}
                        >
                            all
                        </button>

                        <button
                            className={
                                filter === "open"
                                ? "active-pr-filter"
                                : ""
                            }
                            onClick={() => setFilter("open")}
                        >
                            open
                        </button>

                        <button
                            className={
                                filter === "merged"
                                ? "active-pr-filter"
                                : ""
                            }
                            onClick={() => setFilter("merged")}
                        >
                            merged
                        </button>

                    </div>

                </div>

                <div className="pull-status-bar">

                    <span>
                        {openCount} open
                    </span>

                    <span>
                        {mergedCount} merged
                    </span>

                </div>

                <div className="pull-list">

                    {filteredPullRequests.map((pr) => (

                        <div
                            className="pull-row"
                            key={pr.id}
                        >

                            <div
                                className={`pull-status-dot ${pr.status}`}
                            ></div>

                            <div className="pull-main">

                                <div className="pull-title-row">

                                    <h2>
                                        {pr.title}
                                    </h2>

                                    <span
                                        className={`pr-badge ${pr.status}`}
                                    >
                                        {pr.status}
                                    </span>

                                </div>

                                <p>

                                    #{pr.id} from{" "}

                                    <strong>
                                        {pr.branch}
                                    </strong>

                                    {" "}by {pr.author}

                                    {" · "}

                                    {pr.updated}

                                </p>

                            </div>

                            <div className="pull-meta">

                                <span>
                                    {pr.commits} commits
                                </span>

                                <span>
                                    {pr.comments} comments
                                </span>

                            </div>

                        </div>

                    ))}

                </div>

            </div>

        </DashboardLayout>
    );
};

export default PullRequests;