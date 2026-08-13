import { useEffect, useState } from "react";
import {
    fetchRepositoryFile,
    fetchRepositoryTree
} from "../../api/repositoryApi";

const formatBytes = (bytes) => {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RepositoryCode = ({ repository }) => {
    const [currentPath, setCurrentPath] = useState("");
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState("");
    const [fileLoading, setFileLoading] = useState(false);
    const [fileError, setFileError] = useState("");

    useEffect(() => {
        const loadTree = async () => {
            setLoading(true);
            setError("");

            try {
                const data = await fetchRepositoryTree(
                    repository._id,
                    currentPath
                );
                setEntries(data.entries || []);
            } catch (error) {
                setError(
                    error.response?.data?.message ||
                    "Failed to load repository contents"
                );
            } finally {
                setLoading(false);
            }
        };
        loadTree();
    }, [repository._id, currentPath]);

    const openFile = async (filePath) => {
        setSelectedFile({ path: filePath });
        setFileContent("");
        setFileError("");
        setFileLoading(true);

        try {
            const data = await fetchRepositoryFile(
                repository._id,
                filePath
            );
            setFileContent(data.content);
        } catch (error) {
            setFileError(
                error.response?.data?.message ||
                "Failed to load file"
            );
        } finally {
            setFileLoading(false);
        }
    };

    const navigateTo = (path) => {
        setSelectedFile(null);
        setFileError("");
        setCurrentPath(path);
    };

    const segments = currentPath
        ? currentPath.split("/")
        : [];

    return (
        <div className="code-browser">
            <div className="code-browser-toolbar">
                <span className="branch-reference">
                    {repository.branches?.[0] || "main"}
                </span>
            </div>

            {selectedFile ? (
                <div className="file-viewer">
                    <div className="file-viewer-header">
                        <button
                            className="file-viewer-back"
                            onClick={() => setSelectedFile(null)}
                        >
                            Back to files
                        </button>
                        <strong>{selectedFile.path}</strong>
                    </div>
                    {fileLoading && <p>Loading file...</p>}
                    {fileError && (
                        <p className="code-browser-error">{fileError}</p>
                    )}
                    {!fileLoading && !fileError && (
                        <pre className="code-viewer">
                            {fileContent}
                        </pre>
                    )}
                </div>
            ) : (
                <div className="file-tree">
                    <div className="breadcrumbs">
                        <button
                            className="breadcrumb-link"
                            onClick={() => navigateTo("")}
                        >
                            {repository.name}
                        </button>
                        {segments.map((segment, index) => {
                            const target = segments
                                .slice(0, index + 1)
                                .join("/");

                            return (
                                <span key={target}>
                                    <span className="breadcrumb-separator">/</span>
                                    <button
                                        className="breadcrumb-link"
                                        onClick={() => navigateTo(target)}
                                    >
                                        {segment}
                                    </button>
                                </span>
                            );
                        })}
                    </div>

                    {loading && <p>Loading repository contents...</p>}
                    {error && (
                        <p className="code-browser-error">{error}</p>
                    )}
                    {!loading && !error && entries.length === 0 && (
                        <p className="code-browser-empty">
                            This repository is empty.
                        </p>
                    )}
                    {!loading && !error && entries.length > 0 && (
                        <div className="file-list">
                            {entries.map((entry) => (
                                <button
                                    key={entry.path}
                                    className="file-row"
                                    onClick={() =>
                                        entry.type === "folder"
                                            ? navigateTo(entry.path)
                                            : openFile(entry.path)
                                    }
                                >
                                    <span className="file-icon">
                                        {entry.type === "folder" ? "📁" : "📄"}
                                    </span>
                                    <span className="file-name">
                                        {entry.name}
                                    </span>
                                    {entry.size !== undefined && (
                                        <span className="file-size">
                                            {formatBytes(entry.size)}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RepositoryCode;
