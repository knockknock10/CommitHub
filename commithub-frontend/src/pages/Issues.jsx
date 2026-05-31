import { useState } from "react";

import DashboardLayout from "../components/dashboard/DashboardLayout";

import "../styles/issues.css";

const issueData = [

    {
        id: 42,
        title: "fix authentication redirect after login",
        repo: "commithub-frontend",
        status: "open",
        label: "bug",
        author: "sanjeev",
        comments: 3,
        updated: "updated 12 minutes ago"
    },

    {
        id: 38,
        title: "add repository creation form",
        repo: "commithub-frontend",
        status: "open",
        label: "feature",
        author: "sanjeev",
        comments: 5,
        updated: "updated 1 hour ago"
    },

    {
        id: 31,
        title: "connect aws s3 upload service with backend",
        repo: "aws-storage-service",
        status: "open",
        label: "backend",
        author: "sanjeev",
        comments: 2,
        updated: "updated yesterday"
    },

    {
        id: 27,
        title: "improve branch merge response handling",
        repo: "commithub-backend",
        status: "closed",
        label: "enhancement",
        author: "sanjeev",
        comments: 4,
        updated: "closed 2 days ago"
    },

    {
        id: 18,
        title: "protected route should block dashboard access",
        repo: "commithub-frontend",
        status: "closed",
        label: "bug",
        author: "sanjeev",
        comments: 1,
        updated: "closed 4 days ago"
    }
];

const Issues = () => {

    const [search, setSearch] = useState("");

    const [filter, setFilter] = useState("all");

    const filteredIssues = issueData.filter((issue) => {

        const matchesSearch =
        issue.title.toLowerCase().includes(search.toLowerCase()) ||
        issue.repo.toLowerCase().includes(search.toLowerCase()) ||
        issue.label.toLowerCase().includes(search.toLowerCase());

        const matchesFilter =
        filter === "all" || issue.status === filter;

        return matchesSearch && matchesFilter;
    });

    const openCount =
    issueData.filter((issue) => issue.status === "open").length;

    const closedCount =
    issueData.filter((issue) => issue.status === "closed").length;

    return (

        <DashboardLayout>

            <div className="issues-page">

                <div className="issues-header">

                    <div>

                        <h1>
                            Issues
                        </h1>

                        <p>
                            Track bugs, feature requests, tasks, and repository discussions.
                        </p>

                    </div>

                    <button className="new-issue-btn">
                        New issue
                    </button>

                </div>

                <div className="issues-toolbar">

                    <input
                        type="text"
                        placeholder="Search issues..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <div className="issue-filters">

                        <button
                            className={filter === "all" ? "active-issue-filter" : ""}
                            onClick={() => setFilter("all")}
                        >
                            all
                        </button>

                        <button
                            className={filter === "open" ? "active-issue-filter" : ""}
                            onClick={() => setFilter("open")}
                        >
                            open
                        </button>

                        <button
                            className={filter === "closed" ? "active-issue-filter" : ""}
                            onClick={() => setFilter("closed")}
                        >
                            closed
                        </button>

                    </div>

                </div>

                <div className="issues-status-bar">

                    <span>
                        {openCount} open
                    </span>

                    <span>
                        {closedCount} closed
                    </span>

                </div>

                <div className="issues-list">

                    {filteredIssues.map((issue) => (

                        <div
                            className="issue-row"
                            key={issue.id}
                        >

                            <div className={`issue-status-dot ${issue.status}`}></div>

                            <div className="issue-main">

                                <div className="issue-title-row">

                                    <h2>
                                        {issue.title}
                                    </h2>

                                    <span className={`issue-label ${issue.label}`}>
                                        {issue.label}
                                    </span>

                                </div>

                                <p>
                                    #{issue.id} opened in {issue.repo} by {issue.author} · {issue.updated}
                                </p>

                            </div>

                            <div className="issue-comments">

                                {issue.comments} comments

                            </div>

                        </div>

                    ))}

                </div>

            </div>

        </DashboardLayout>
    );
};

export default Issues;