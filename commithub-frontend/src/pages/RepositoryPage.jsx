import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useParams } from "react-router-dom";
import { fetchRepositoryById } from "../api/repositoryApi";
import { useEffect, useState } from "react";
import IssueList from "../components/issue/IssueList";
import "../styles/repository.css";

const RepositoryPage = () => {

    const { id } = useParams();
    const [repository, setRepository] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("code");

    useEffect(() => {
        const loadRepository = async () => {
            try {
                const data = await fetchRepositoryById(id);
                setRepository(data);
            } catch (error) {
                setError(
                    `Failed to load repository: ${error.message}`
                );
            } finally {
                setLoading(false);
            }
        };
        loadRepository();
    }, [id]);
    if (loading) {
        return (
            <DashboardLayout>
                <div className="repository-page">
                    <p>Loading repository...</p>
                </div>
            </DashboardLayout>
        );
    }
    if (error) {
        return (
            <DashboardLayout>
                <div className="repository-page">
                    <p>{error}</p>
                </div>
            </DashboardLayout>
        );
    }
    return (
        <DashboardLayout>
            <div className="repository-page">
                <div className="repository-header">
                    <div>
                        <h1>{repository.name}</h1>
                        <p>{repository.description}</p>
                    </div>
                    <span
                        className={`visibility-badge ${repository.visibility}`}
                    >
                        {repository.visibility}
                    </span>
                </div>
                <div className="repository-stats">
                    <div className="stat-card">
                        <span>Stars</span>
                        <h3>{repository.stars}</h3>
                    </div>
                    <div className="stat-card">
                        <span>Forks</span>
                        <h3>{repository.forks}</h3>
                    </div>
                    <div className="stat-card">
                        <span>Branches</span>
                        <h3>{repository.branches?.length || 0}</h3>
                    </div>
                </div>
                <div className="repository-tabs">
                    <button onClick={() =>setActiveTab("code")}>Code</button>
                    <button onClick={() =>setActiveTab("issues")}>Issues</button>
                    <button onClick={() =>setActiveTab("branches")}>Branches</button>
                    <button onClick={() =>setActiveTab("settings")}>Settings</button>
                </div>
                <div className="repository-content">
                    {activeTab === "code" && (
                        <div className="repository-section">
                            <h2>Code</h2>
                            <p>
                                Repository code view coming soon.
                            </p>
                        </div>
                    )}
                    {activeTab === "issues" && (
                        <IssueList
                            repositoryId={
                                repository._id
                            }
                        />
                    )}
                    {activeTab === "branches" && (
                        <div className="repository-section">
                            <h2>Branches</h2>
                            <div className="branch-list">
                                {repository.branches?.map((branch) => (
                                    <div
                                        key={branch}
                                        className="branch-card"
                                    >
                                        {branch}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === "settings" && (
                        <div className="repository-section">
                            <h2>
                                Repository Information</h2>
                            <div className="repo-info-grid">
                                <div>
                                    <strong>
                                        Visibility
                                    </strong>
                                    <p>
                                        {repository.visibility}</p>
                                </div>
                                <div>
                                    <strong>Created</strong>
                                    <p>
                                        {new Date(repository.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <strong>
                                        Updated
                                    </strong>
                                    <p>
                                        {new Date(repository.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};
export default RepositoryPage;