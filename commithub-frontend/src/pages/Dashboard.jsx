import DashboardLayout from "../components/dashboard/DashboardLayout";
import { fetchRepositories } from "../api/repositoryApi.js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/dashboard.css";

const activities = [
    {
        title: "pushed changes to commithub-frontend",
        detail: "updated dashboard layout and repository cards",
        time: "12 minutes ago",
    },
    {
        title: "created branch feature/repo-page",
        detail: "new branch created from main",
        time: "48 minutes ago",
    },
    {
        title: "resolved issue #18",
        detail: "fixed authentication redirect behavior",
        time: "2 hours ago",
    },
    {
        title: "merged pull request #7",
        detail: "added protected route support",
        time: "yesterday",
    },
];

const Dashboard = () => {
    const [repositories, setRepositories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const loadRepositories = async () => {
            try {
                const data = await fetchRepositories();
                setRepositories(data);
            } catch {
                setError("Failed to load repositories");
            } finally {
                setLoading(false);
            }
        };
        loadRepositories();
    }, []);

    return (
        <DashboardLayout>
            <div className="dashboard-page">
                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>
                            Welcome back. Track repositories, commits, issues, and development activity.
                        </p>
                    </div>
                    <button
                        className="new-repo-btn"
                        onClick={() => navigate("/new")}
                    >
                        New repo
                    </button>
                </div>
                <div className="dashboard-summary">
                    <div className="summary-card">
                        <span>repositories</span>
                        <h3>{repositories.length}</h3>
                    </div>
                    <div className="summary-card">
                        <span>pull requests</span>
                        <h3>4</h3>
                    </div>
                    <div className="summary-card">
                        <span>issues</span>
                        <h3>9</h3>
                    </div>
                    <div className="summary-card">
                        <span>branches</span>
                        <h3>18</h3>
                    </div>
                </div>
                <div className="dashboard-main-grid">
                    <section className="repo-section">
                        <div className="section-header">
                            <h2>Your repositories</h2>
                            <a href="/">View all</a>
                        </div>
                        {loading && <p>Loading repositories...</p>}
                        {error && <p>{error}</p>}
                        <div className="repo-dashboard-list">
                            {repositories.map((repo) => (
                                <div
                                    className="repo-dashboard-card"
                                    key={repo._id}
                                    onClick={() => navigate(`/repo/${repo._id}`)}
                                >
                                    <div className="repo-card-top">
                                        <div>
                                            <div className="repo-title-row">
                                                <h3>{repo.name}</h3>
                                                <span className={repo.visibility}>
                                                    {repo.visibility}
                                                </span>
                                            </div>
                                            <p>{repo.description}</p>
                                        </div>
                                    </div>
                                    <div className="repo-card-bottom">
                                        <span>javascript</span>
                                        <span>★ {repo.stars}</span>
                                        <span>issues 0</span>
                                        <span>{new Date(repo.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                    <aside className="activity-panel">
                        <div className="section-header">
                            <h2>Recent activity</h2>
                        </div>
                        <div className="activity-list">
                            {activities.map((activity, index) => (
                                <div className="activity-item" key={index}>
                                    <div className="activity-dot"></div>
                                    <div>
                                        <h4>{activity.title}</h4>
                                        <p>{activity.detail}</p>
                                        <span>{activity.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;