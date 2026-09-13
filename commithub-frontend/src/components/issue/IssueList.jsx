import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IssueIcon, CloseIcon, PlusIcon } from "../ui/icons";
import { getIssues } from "../../api/issueApi";
import CreateIssue from "./CreateIssue";
import "../../styles/issue.css";

const IssueList = ({ repositoryId }) => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("open");
    const [showForm, setShowForm] = useState(false);

    const loadIssues = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getIssues(repositoryId);
            setIssues(data.issues || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load issues");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIssues();
    }, [repositoryId]);

    const openCount = issues.filter((issue) => issue.status === "open").length;
    const closedCount = issues.length - openCount;
    const visibleIssues = issues.filter(
        (issue) => filter === "all" || issue.status === filter
    );

    const handleCreated = async () => {
        setShowForm(false);
        await loadIssues();
    };

    return (
        <div className="gh-issue-container">
            <div className="gh-issue-toolbar">
                <div className="gh-issue-toolbar-left">
                    <div className="gh-issue-tabs">
                        <button
                            className={`gh-issue-tab ${filter === 'open' ? 'active' : ''}`}
                            onClick={() => setFilter('open')}
                        >
                            <IssueIcon size={14} /> Open <span className="gh-issue-count">{openCount}</span>
                        </button>
                        <button
                            className={`gh-issue-tab ${filter === 'closed' ? 'active' : ''}`}
                            onClick={() => setFilter('closed')}
                        >
                            <CloseIcon size={14} /> Closed <span className="gh-issue-count">{closedCount}</span>
                        </button>
                    </div>
                </div>
                <div className="gh-issue-new-wrap">
                    <button
                        className="gh-issue-new-btn"
                        onClick={() => setShowForm((prev) => !prev)}
                    >
                        <PlusIcon size={14} /> {showForm ? "Close" : "New issue"}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="gh-issue-create-wrap">
                    <CreateIssue
                        repositoryId={repositoryId}
                        onIssueCreated={handleCreated}
                    />
                </div>
            )}

            {loading && <div className="shared-loading"><p>Loading issues...</p></div>}
            {error && <div className="shared-error"><p>{error}</p></div>}

            {!loading && !error && (
                <div className="gh-issue-list">
                    {visibleIssues.length === 0 ? (
                        <div className="shared-empty-state">
                            <p>No {filter} issues found.</p>
                        </div>
                    ) : (
                        <div className="gh-issue-table">
                            {visibleIssues.map((issue) => (
                                <div
                                    className="gh-issue-row"
                                    key={issue._id}
                                >
                                    <div className="gh-issue-row-left">
                                        <span className={`gh-issue-status ${issue.status}`}>
                                            {issue.status === 'open' ? (
                                                <IssueIcon size={14} />
                                            ) : (
                                                <CloseIcon size={14} />
                                            )}
                                        </span>
                                        <Link
                                            to={`/issues/${issue._id}`}
                                            className="gh-issue-link"
                                        >
                                            {issue.title}
                                        </Link>
                                        {issue.label && (
                                            <span className="gh-issue-label">
                                                {issue.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="gh-issue-row-right">
                                        <span className="gh-issue-author">
                                            {issue.author?.userName || "unknown"}
                                        </span>
                                        <span className="gh-issue-date">
                                            {new Date(issue.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IssueList;