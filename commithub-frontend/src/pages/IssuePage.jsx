import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
    getIssueById,
    closeIssue,
    reopenIssue
} from "../api/issueApi";
import "../styles/issuePage.css";

const IssuePage = () => {

    const { id } = useParams();

    const [issue, setIssue] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadIssue = async () => {
        try {
            const data = await getIssueById(id);
            setIssue(data);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIssue();
    }, [id]);

    const handleStatus = async () => {
        try {

            if (issue.status === "open") {
                await closeIssue(issue._id);
            } else {

                await reopenIssue(issue._id);
            }
            await loadIssue();
        } catch (err) {
            console.log(err);

        }
    };

    if (loading) {

        return (
            <DashboardLayout>
                <p>Loading issue...</p>
            </DashboardLayout>
        );
    }

    if (!issue) {
        return (
            <DashboardLayout>
                <p>Issue not found.</p>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="issue-page">

                <div className="issue-container">
                    <div className="issue-page-header">
                        <h1>{issue.title}</h1>
                        <span className={issue.status}>
                            {issue.status}
                        </span>

                    </div>
                    <p className="issue-description">
                        {issue.description}
                    </p>
                    <div className="issue-details">
                        <div>
                            <strong>Label</strong>
                            <p>{issue.label}</p>
                        </div>

                        <div>
                            <strong>Author</strong>
                            <p>
                                {issue.author?.userName || "Unknown"}
                            </p>
                        </div>

                        <div>
                            <strong>Created</strong>
                            <p>
                                {new Date(
                                    issue.createdAt
                                ).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <button
                        className="issue-action-btn"
                        onClick={handleStatus}
                    >
                        {
                            issue.status === "open"
                            ? "Close Issue"
                            : "Reopen Issue"
                        }
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
};
export default IssuePage;