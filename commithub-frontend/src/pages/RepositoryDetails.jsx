import { useParams } from "react-router-dom";

import DashboardLayout from "../components/dashboard/DashboardLayout";

import "../styles/repositoryDetails.css";

const files = [

    {
        name: "backend",
        type: "folder",
        message: "updated auth controller and repository logic",
        time: "2 hours ago"
    },

    {
        name: "commithub-frontend",
        type: "folder",
        message: "added repository dashboard pages",
        time: "3 hours ago"
    },

    {
        name: "Readme.md",
        type: "file",
        message: "updated project documentation",
        time: "yesterday"
    },

    {
        name: "package.json",
        type: "file",
        message: "added project scripts",
        time: "2 days ago"
    },

    {
        name: "structure.txt",
        type: "file",
        message: "added project folder structure",
        time: "3 days ago"
    }
];

const RepositoryDetails = () => {

    const { repoName } = useParams();

    return (

        <DashboardLayout>

            <div className="repo-details-page">

                <div className="repo-details-header">

                    <div>

                        <div className="repo-path">

                            <span>
                                SanjeevKumar
                            </span>

                            <span>
                                /
                            </span>

                            <strong>
                                {repoName}
                            </strong>

                            <span className="repo-visibility">
                                public
                            </span>

                        </div>

                        <p>
                            Git-inspired repository workspace for managing code, commits, branches, and collaboration.
                        </p>

                    </div>

                    <div className="repo-header-actions">

                        <button>
                            Watch
                        </button>

                        <button>
                            Star
                        </button>

                        <button>
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
                        Pull requests
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
                        main
                    </button>

                    <div className="repo-toolbar-info">

                        <span>
                            142 commits
                        </span>

                        <span>
                            4 branches
                        </span>

                        <span>
                            2 releases
                        </span>

                    </div>

                    <button className="code-btn">
                        Code
                    </button>

                </div>

                <div className="latest-commit">

                    <div>

                        <strong>
                            Sanjeev Kumar
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
                            key={index}
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
                            This repository contains the frontend and backend structure for authentication, repository management, commits, branches, issues, and AWS S3 based file handling.
                        </p>

                        <h3>
                            Features
                        </h3>

                        <ul>

                            <li>
                                Repository management
                            </li>

                            <li>
                                Commit and branch workflows
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