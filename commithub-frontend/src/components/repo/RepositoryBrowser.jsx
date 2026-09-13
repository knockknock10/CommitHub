import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BranchIcon,
    FolderIcon,
    FileIcon,
    ChevronRightIcon,
    CopyIcon,
    CheckIcon
} from "../ui/icons";
import {
    fetchRepositoryTree,
    fetchRepositoryBranchTree,
    fetchRepositoryFile,
    fetchRepositoryBranchBlob,
    fetchRepositoryBranches
} from "../../api/repositoryApi";
import { formatRelativeTime } from "../../utils/activityUtils";
import renderMarkdown from "../../utils/renderMarkdown";

const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RepositoryBrowser = ({ repository }) => {
    const repoId = repository._id;

    /* The repository document's branches array is metadata only; the real
       branches live in the version-control refs (listBranches). Fall back
       to the metadata when the branch list cannot be fetched. */
    const fallbackBranches = useMemo(() => {
        return repository.branches?.length
            ? repository.branches
            : ["main"];
    }, [repository.branches]);
    const [branchOptions, setBranchOptions] = useState(fallbackBranches);
    const [worktreeBranch, setWorktreeBranch] = useState(fallbackBranches[0]);

    const [branch, setBranch] = useState(worktreeBranch);
    const [branchListLoaded, setBranchListLoaded] = useState(false);

    const currentBranch = branchOptions.includes(branch) ? branch : worktreeBranch;
    const [currentPath, setCurrentPath] = useState("");
    const [entries, setEntries] = useState([]);
    const [entriesLoading, setEntriesLoading] = useState(true);
    const [entriesError, setEntriesError] = useState("");

    const [selectedFile, setSelectedFile] = useState(null);
    const [fileData, setFileData] = useState(null);
    const [fileLoading, setFileLoading] = useState(false);
    const [fileError, setFileError] = useState("");
    const [copied, setCopied] = useState(false);

    const [readme, setReadme] = useState(null);

    const fetchBranchFile = useCallback(
        async (filePath) => {
            if (branch === worktreeBranch) {
                return await fetchRepositoryFile(repoId, filePath);
            }
            return await fetchRepositoryBranchBlob(repoId, branch, filePath);
        },
        [branch, worktreeBranch, repoId]
    );

    const loadEntries = useCallback(
        async (path, targetBranch) => {
            setEntriesLoading(true);
            setEntriesError("");

            try {
                const data =
                    targetBranch === worktreeBranch
                        ? await fetchRepositoryTree(repoId, path)
                        : await fetchRepositoryBranchTree(
                              repoId,
                              targetBranch,
                              path
                          );
                setEntries(data.entries || []);
            } catch (error) {
                setEntriesError(
                    error.response?.data?.message ||
                        "Failed to load repository contents"
                );
            } finally {
                setEntriesLoading(false);
            }
        },
        [repoId, worktreeBranch]
    );

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const data = await fetchRepositoryBranches(repoId);
                if (cancelled) return;

                const names =
                    data.branches && data.branches.length > 0
                        ? data.branches.map((entry) => entry.name)
                        : fallbackBranches;
                const defaultBranch =
                    data.currentBranch && names.includes(data.currentBranch)
                        ? data.currentBranch
                        : names[0] || "main";

                setBranchOptions(names);
                setWorktreeBranch(defaultBranch);
                setBranch((previous) =>
                    names.includes(previous) ? previous : defaultBranch
                );
            } catch {
                /* keep the metadata fallback */
            } finally {
                if (!cancelled) setBranchListLoaded(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [repoId, fallbackBranches]);

    useEffect(() => {
        if (!branchListLoaded) return;
        setEntries([]);
        loadEntries(currentPath, currentBranch);
    }, [currentPath, currentBranch, branchListLoaded, loadEntries]);

    /* README.md preview at the repository root */
    useEffect(() => {
        let cancelled = false;
        setReadme(null);

        if (currentPath !== "") return undefined;

        const readmeEntry = entries.find(
            (entry) =>
                entry.type !== "folder" &&
                /^readme\./i.test(entry.name)
        );

        if (!readmeEntry) return undefined;

        (async () => {
            try {
                const data = await fetchBranchFile(readmeEntry.path);
                if (!cancelled) setReadme(renderMarkdown(data.content));
            } catch {
                /* best-effort: README preview is optional */
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentPath, currentBranch, entries, worktreeBranch, fetchBranchFile]);

    const openFile = async (filePath) => {
        setSelectedFile(filePath);
        setFileData(null);
        setFileError("");
        setCopied(false);
        setFileLoading(true);

        try {
            const data = await fetchBranchFile(filePath);
            setFileData(data);
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
        setFileData(null);
        setFileError("");
        setCopied(false);
        setCurrentPath(path);
    };

    const handleBranchChange = (e) => {
        const next = e.target.value;
        setBranch(next);
        navigateTo("");
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(fileData.content || "");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const segments = currentPath ? currentPath.split("/") : [];
    const contentLines = fileData?.content?.split("\n") || [];

    const renderEmptyState = () => {
        let message = "This directory is empty.";

        if (currentPath === "") {
            message =
                currentBranch !== worktreeBranch
                    ? "This branch has no committed files."
                    : "This repository has no files yet.";
        }

        return (
            <div className="repo-empty">
                <p>{message}</p>
            </div>
        );
    };

    return (
        <div className="repo-browser">
            {selectedFile ? (
                <div className="repo-file-viewer">
                    <div className="repo-viewer-header">
                        <button
                            type="button"
                            className="repo-viewer-back"
                            onClick={() => navigateTo(currentPath)}
                        >
                            <ChevronRightIcon className="repo-viewer-back-icon" size={14} />
                            Files
                        </button>
                        <span className="repo-viewer-path">
                            <FileIcon size={14} />
                            <span>{selectedFile}</span>
                        </span>
                        {!fileLoading && !fileError && fileData && (
                            <button
                                type="button"
                                className="repo-copy-btn"
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
                    </div>

                    {fileLoading && (
                        <div className="shared-loading">
                            <p>Loading file…</p>
                        </div>
                    )}

                    {fileError && (
                        <div className="shared-error">
                            <p>{fileError}</p>
                            <button
                                type="button"
                                className="state-btn"
                                onClick={() => openFile(selectedFile)}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {fileData && fileData.binary && (
                        <div className="repo-file-message">
                            <p>Binary file cannot be viewed.</p>
                        </div>
                    )}

                    {fileData && fileData.tooLarge && (
                        <div className="repo-file-message">
                            <p>File is too large to view.</p>
                        </div>
                    )}

                    {fileData && !fileData.binary && !fileData.tooLarge && !fileLoading && !fileError && (
                        <div className="repo-code">
                            <table className="repo-code-lines">
                                <tbody>
                                    {contentLines.map((line, index) => (
                                        <tr key={index} className="repo-code-line">
                                            <td className="repo-code-line-no">
                                                {index + 1}
                                            </td>
                                            <td className="repo-code-line-text">
                                                {line || " "}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="repo-tree">
                    <div className="repo-toolbar">
                        <span className="repo-branch-switch">
                            <BranchIcon size={14} />
                            <select
                                className="repo-branch-select"
                                aria-label="Switch branch"
                                value={currentBranch}
                                onChange={handleBranchChange}
                            >
                                {branchOptions.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            <ChevronRightIcon className="repo-branch-chevron" size={12} />
                        </span>
                        <span className="repo-entry-count">
                            {entriesLoading
                                ? "…"
                                : `${entries.length} ${
                                      entries.length === 1 ? "item" : "items"
                                  }`}
                        </span>
                    </div>

                    <nav className="repo-crumbs" aria-label="Breadcrumb">
                        <button
                            type="button"
                            className="repo-crumb-link"
                            onClick={() => navigateTo("")}
                        >
                            {repository.name}
                        </button>
                        {segments.map((segment, index) => {
                            const target = segments
                                .slice(0, index + 1)
                                .join("/");

                            return (
                                <span
                                    className="repo-crumb-seg"
                                    key={target}
                                >
                                    <ChevronRightIcon
                                        size={13}
                                        className="repo-crumb-sep"
                                    />
                                    <button
                                        type="button"
                                        className="repo-crumb-link"
                                        onClick={() => navigateTo(target)}
                                    >
                                        {segment}
                                    </button>
                                </span>
                            );
                        })}
                        {currentPath !== "" && (
                            <span className="repo-crumb-branch">
                                at {currentBranch}
                            </span>
                        )}
                    </nav>

                    {entriesLoading && (
                        <div className="shared-loading">
                            <p>Loading repository contents…</p>
                        </div>
                    )}

                    {!entriesLoading && entriesError && (
                        <div className="shared-error">
                            <p>{entriesError}</p>
                            <button
                                type="button"
                                className="state-btn"
                                onClick={() =>
                                    loadEntries(currentPath, currentBranch)
                                }
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!entriesLoading && !entriesError && entries.length === 0 && (
                        renderEmptyState()
                    )}

                    {!entriesLoading &&
                        !entriesError &&
                        entries.length > 0 && (
                            <table className="repo-file-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Name</th>
                                        <th scope="col" className="repo-col-size">
                                            Size
                                        </th>
                                        <th scope="col" className="repo-col-date">
                                            Last updated
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((entry) => {
                                        const isFolder =
                                            entry.type === "folder";
                                        const label = isFolder
                                            ? `Open folder ${entry.name}`
                                            : `Open file ${entry.name}`;

                                        return (
                                            <tr key={entry.path}>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="repo-file-cell"
                                                        onClick={() =>
                                                            isFolder
                                                                ? navigateTo(
                                                                      entry.path
                                                                  )
                                                                : openFile(
                                                                      entry.path
                                                                  )
                                                        }
                                                        aria-label={label}
                                                    >
                                                        {isFolder ? (
                                                            <ChevronRightIcon
                                                                size={14}
                                                                className="repo-file-chevron"
                                                            />
                                                        ) : (
                                                            <span className="repo-file-chevron-spacer" />
                                                        )}
                                                        <span
                                                            className="repo-file-icon"
                                                            aria-hidden="true"
                                                        >
                                                            {isFolder ? (
                                                                <FolderIcon size={16} />
                                                            ) : (
                                                                <FileIcon size={15} />
                                                            )}
                                                        </span>
                                                        <span className="repo-file-name">
                                                            {entry.name}
                                                            {isFolder ? "/" : ""}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="repo-col-size">
                                                    {isFolder
                                                        ? ""
                                                        : formatBytes(entry.size)}
                                                </td>
                                                <td className="repo-col-date">
                                                    {formatRelativeTime(
                                                        entry.updatedAt
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                    {!selectedFile && readme && (
                        <div className="repo-readme">
                            <div className="repo-readme-header">
                                <FileIcon size={14} />
                                <span>
                                    {entries.find(
                                        (entry) =>
                                            entry.type !== "folder" &&
                                            /^readme\./i.test(entry.name)
                                    )?.name || "README.md"}
                                </span>
                            </div>
                            <div className="repo-readme-body">
                                {readme}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RepositoryBrowser;