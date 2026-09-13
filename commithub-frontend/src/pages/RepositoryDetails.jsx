import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import DashboardLayout from "../components/dashboard/DashboardLayout";
import { fetchRepositoryById, fetchRepositoryTree, fetchRepositoryBranches } from "../api/repositoryApi";
import "../styles/repositoryDetails.css";

const RepositoryDetails = () => {
    const { repoName } = useParams();
    const [repo, setRepo] = useState(null);
    const [files, setFiles] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("main");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadRepo = async () => {
            try {
                const data = await fetchRepositoryById(repoName);
                setRepo(data);
            } catch {
                setError("Failed to load repository.");
            } finally {
                setLoading(false);
            }
        };

        const loadFiles = async () => {
            try {
                const data = await fetchRepositoryTree(repoName);
                setFiles(data.tree || []);
            } catch {
                setError("Failed to load files.");
            }
        };

        const loadBranches = async () => {
            try {
                const data = await fetchRepositoryBranches(repoName);
                setBranches(data.branches || []);
            } catch {
                setError("Failed to load branches.");
            }
        };

        loadRepo();
        loadFiles();
        loadBranches();
    }, [repoName]);

    if (loading || !repo) {
        return (
            <DashboardLayout>
                <div className="shared-loading">
                    <p>Loading repository...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="shared-error">
                    <p>{error}</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="repo-details-page">

                <div className="repo-details-header">

                    <div>

                        <div className="repo-path">

                            <span>
                                {repo.owner?.userName || repo.owner || "SanjeevKumar"}
                            </span>

                            <span>
                                /
                            </span>

                            <strong>
                                {repo.name}
                            </strong>

                            <span className="repo-visibility">
                                {repo.visibility}
                            </span>

                        </div>

                        <p>
                            Git-inspired repository for managing code, commits, streams, and collaboration.
                        </p>

                    </div>

                    <div className="repo-header-actions">

                        <button
                            onClick={() => alert("Watch functionality would trigger here")}
                        >
                            Watch
                        </button>

                        <button
                            onClick={() => alert("Star functionality would trigger here")}
                        >
                            Star
                        </button>

                        <button
                            onClick={() => alert("Fork functionality would trigger here")}
                        >
                            Fork
                        </button>

                    </div>

                </div>

                <div className="repo-tabs">

                    <button className="active-tab">
                        Code
                    </button>

                    <button>
                        Issues
                    </button>

                    <button>
                        pull requests
                    </button>

                    <button>
                        Actions
                    </button>

                    <button>
                        Projects
                    </button>

                    <button>
                        Settings
                    </button>

                </div>

                <div className="repo-toolbar">

                    <button className="branch-btn">
                        {selectedBranch}
                    </button>

                    <div className="repo-toolbar-info">

                        <span>
                            {repo?.commits?.length || 142} commits
                        </span>

                        <span>
                            {branches.length || 4} streams
                        </span>

                        <span>
                            2 versions
                        </span>

                    </div>

                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                        {branches.map((branch) => (
                            <option key={branch} value={branch}>
                                {branch}
                            </option>
                        ))}
                        <option value="main">main</option>
                    </select>

                </div>

                <div className="latest-commit">

                    <div>

                        <strong>
                            {repo.owner?.userName || "Sanjeev Kumar"}
                        </strong>

                        <span>
                            updated repository page layout
                        </span>

                    </div>

                    <p>
                        2 hours ago
                    </p>

                </div>

                <div className="file-list">

                    {files.map((file, index) => (

                        <div
                            className="file-row"
                            key={file._id || index}
                        >

                            <div className="file-name">

                                <span>
                                    {file.type === "folder" ? "📁" : "📄"}
                                </span>

                                <strong>
                                    {file.name}
                                </strong>

                            </div>

                            <p>
                                {file.message}
                            </p>

                            <span>
                                {file.time}
                            </span>

                        </div>

                    ))}

                    {files.length === 0 && (
                        <p className="no-files-found">
                            No files found.
                        </p>
                    )}

                </div>

                <div className="readme-box">

                    <div className="readme-header">

                        README.md

                    </div>

                    <div className="readme-content">

                        <h2>
                            CommitHub
                        </h2>

                        <p>
                            CommitHub is a Git-inspired version control and collaboration platform built for developers.
                        </p>

                        <p>
                            This repository contains the frontend and backend structure for authentication, repository management, commits, streams, issues, and AWS S3 based file handling.
                        </p>

                        <h3>
                            Features
                        </h3>

                        <ul>

                            <li>
                                Repository management
                            </li>

                            <li>
                                Commit and stream workflows
                            </li>

                            <li>
                                Issue tracking
                            </li>

                            <li>
                                Secure authentication
                            </li>

                            <li>
                                AWS S3 storage integration
                            </li>

                        </ul>

                    </div>

                </div>

            </div>
        </DashboardLayout>
    );
};

export default RepositoryDetails;