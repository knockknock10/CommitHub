import { useEffect, useMemo, useState } from "react";
import {
    FolderIcon,
    FileIcon,
    ChevronRightIcon,
    CopyIcon,
    CheckIcon,
    BranchIcon
} from "../ui/icons";
import {
    fetchRepositoryFile,
    fetchRepositoryTree
} from "../../api/repositoryApi";

const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
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
    const [copied, setCopied] = useState(false);

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
        setCopied(false);
        setFileLoading(true);

        try {
            const data = await fetchRepositoryFile(repository._id, filePath);
            setFileContent(data.content);
        } catch (error) {
            setFileError(
                error.response?.data?.message || "Failed to load file"
            );
        } finally {
            setFileLoading(false);
        }
    };

    const navigateTo = (path) => {
        setSelectedFile(null);
        setFileError("");
        setCopied(false);
        setCurrentPath(path);
    };

    const segments = useMemo(
        () => (currentPath ? currentPath.split("/") : []),
        [currentPath]
    );

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(fileContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const contentLines = useMemo(() => fileContent.split("\n"), [fileContent]);

    return (
        <div className="code-browser">
            {selectedFile ? (
                <div className="file-viewer">
                    <div className="file-viewer-header">
                        <button
                            className="file-viewer-back"
                            onClick={() => navigateTo(currentPath)}
                        >
                            <ChevronRightIcon
                                size={14}
                                style={{ transform: "rotate(180deg)" }}
                            />
                            Files
                        </button>
                        <span className="file-viewer-path">
                            <FileIcon size={14} />
                            <strong>{selectedFile.path}</strong>
                        </span>
                        <span className="file-viewer-actions">
                            {!fileLoading && !fileError && (
                                <button
                                    className="file-copy-btn"
                                    onClick={copyToClipboard}
                                    aria-label="Copy file contents"
                                >
                                    {copied ? (
                                        <CheckIcon size={14} />
                                    ) : (
                                        <CopyIcon size={14} />
                                    )}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            )}
                        </span>
                    </div>
                    {fileLoading && (
                        <div className="shared-loading">
                            <p>Loading file...</p>
                        </div>
                    )}
                    {fileError && (
                        <div className="shared-error">
                            <p>{fileError}</p>
                        </div>
                    )}
                    {!fileLoading && !fileError && (
                        <div className="code-viewer">
                            <table className="code-lines">
                                <tbody>
                                    {contentLines.map((line, index) => (
                                        <tr key={index} className="code-line">
                                            <td className="code-line-no">
                                                {index + 1}
                                            </td>
                                            <td className="code-line-content">
                                                {line}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="file-tree">
                    <div className="code-browser-toolbar">
                        <span className="branch-reference">
                            <BranchIcon size={13} />
                            {repository.branches?.[0] || "main"}
                        </span>
                        <span className="toolbar-spacer" />
                        <span className="tree-entry-count">
                            {entries.length}{" "}
                            {entries.length === 1 ? "entry" : "entries"}
                        </span>
                    </div>
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
                                <span className="breadcrumb-seg" key={target}>
                                    <ChevronRightIcon
                                        size={14}
                                        className="breadcrumb-sep"
                                    />
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

                    {loading && (
                        <div className="shared-loading">
                            <p>Loading repository contents...</p>
                        </div>
                    )}
                    {error && (
                        <div className="shared-error">
                            <p>{error}</p>
                        </div>
                    )}
                    {!loading && !error && entries.length === 0 && (
                        <div className="shared-empty-state">
                            <p>This repository is empty.</p>
                        </div>
                    )}
                    {!loading && !error && entries.length > 0 && (
                        <div className="file-list">
                            {entries.map((entry) => {
                                const isFolder = entry.type === "folder";
                                const size = entry.size;

                                return (
                                    <button
                                        key={entry.path}
                                        className="file-row"
                                        onClick={() =>
                                            isFolder
                                                ? navigateTo(entry.path)
                                                : openFile(entry.path)
                                        }
                                    >
                                        {isFolder ? (
                                            <ChevronRightIcon
                                                size={14}
                                                className="file-chevron"
                                            />
                                        ) : (
                                            <span className="file-chevron-spacer" />
                                        )}
                                        <span className="file-icon">
                                            {isFolder ? (
                                                <FolderIcon size={16} />
                                            ) : (
                                                <FileIcon size={15} />
                                            )}
                                        </span>
                                        <span className="file-name">
                                            {entry.name}
                                        </span>
                                        {size !== undefined && (
                                            <span className="file-size">
                                                {formatBytes(size)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RepositoryCode;