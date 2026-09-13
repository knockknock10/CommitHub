import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
    fetchRepositoryById,
    starRepository,
    unstarRepository,
    forkRepository,
    fetchRepositoryForks,
    fetchPullRequests,
    fetchRepositoryBranches
} from "../api/repositoryApi";
import { getIssues } from "../api/issueApi";
import { useCallback, useEffect, useState } from "react";
import {
    StarIcon,
    StarFilledIcon,
    BranchIcon,
    ForkIcon,
    CodeIcon,
    IssueIcon,
    PullRequestIcon,
    TagIcon,
    GitCommitIcon,
    ActivityIcon,
    UsersIcon,
    SettingsIcon,
    ShieldIcon,
    GlobeIcon,
    ClockIcon
} from "../components/ui/icons";
import IssueList from "../components/issue/IssueList";
import RepositorySettings from "../components/repo/RepositorySettings";
import RepositoryBrowser from "../components/repo/RepositoryBrowser";
import RepositoryCommits from "../components/repo/RepositoryCommits";
import RepositoryActivity from "../components/repo/RepositoryActivity";
import PullRequestList from "../components/repo/PullRequestList";
import ReleaseList from "../components/repo/ReleaseList";
import Collaborators from "../components/repo/Collaborators";
import BranchProtection from "../components/repo/BranchProtection";
import { formatRelativeTime } from "../utils/activityUtils";
import "../styles/repository.css";

const TAB_IDS = [
    "code",
    "issues",
    "pullrequests",
    "commits",
    "branches",
    "releases",
    "activity",
    "collaborators",
    "forks",
    "settings"
];

const RepositoryPage = () => {
    const { id, number } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const requestedTab = number ? "pullrequests" : location.state?.tab || "code";
    const [repository, setRepository] = useState(null);
    const [loadedId, setLoadedId] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [error, setError] = useState("");
    const [errorCode, setErrorCode] = useState(null);
    const [activeTab, setActiveTab] = useState(
        TAB_IDS.includes(requestedTab) ? requestedTab : "code"
    );
    const [starred, setStarred] = useState(false);
    const [starCount, setStarCount] = useState(0);
    const [actionError, setActionError] = useState("");
    const [isForking, setIsForking] = useState(false);
    const [isStarring, setIsStarring] = useState(false);
    const [openIssues, setOpenIssues] = useState(null);
    const [openPRs, setOpenPRs] = useState(null);
    const [realBranchEntries, setRealBranchEntries] = useState(undefined);
    const [forksList, setForksList] = useState([]);
    const [forksLoaded, setForksLoaded] = useState(false);
    const [forksLoading, setForksLoading] = useState(false);
    const [forksError, setForksError] = useState("");

    const loadCounts = useCallback(async (repoId) => {
        try {
            const data = await getIssues(repoId);
            setOpenIssues(
                (data.issues || []).filter(
                    (issue) => issue.status === "open"
                ).length
            );
        } catch {
            /* counts are best-effort */
        }

        try {
            const data = await fetchPullRequests(repoId, {
                status: "open",
                limit: 1
            });
            setOpenPRs(data.total || 0);
        } catch {
            /* counts are best-effort */
        }
    }, []);

    const loadBranches = useCallback(async (repoId) => {
        /* The model.branches array is metadata; the real branch list lives in
           the version-control refs. Cache it for the Branches tab + count. */
        try {
            const data = await fetchRepositoryBranches(repoId);
            setRealBranchEntries(data.branches || []);
        } catch {
            setRealBranchEntries(null);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            try {
                const data = await fetchRepositoryById(id);
                if (cancelled) return;

                setRepository(data);
                setStarred(data.isStarred);
                setStarCount(data.stars);
                setError("");
                setErrorCode(null);
                setRealBranchEntries(undefined);
                loadCounts(data._id);
                loadBranches(data._id);
            } catch (err) {
                if (cancelled) return;

                setErrorCode(err.response?.status || null);
                setError(
                    err.response?.data?.message ||
                        "Failed to load repository. Please try again."
                );
            } finally {
                if (!cancelled) setLoadedId(id);
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [id, reloadKey, loadCounts, loadBranches]);

    const loading = loadedId !== id;

    const handleStarToggle = async () => {
        try {
            setActionError("");
            setIsStarring(true);
            if (starred) {
                const data = await unstarRepository(repository._id);
                setStarred(false);
                setStarCount(data.stars);
            } else {
                const data = await starRepository(repository._id);
                setStarred(true);
                setStarCount(data.stars);
            }
        } catch (err) {
            setActionError(
                err.response?.data?.message || "Could not update star"
            );
        } finally {
            setIsStarring(false);
        }
    };

    const handleFork = async () => {
        try {
            setActionError("");
            setIsForking(true);
            const newRepo = await forkRepository(repository._id, {
                name: repository.name
            });
            navigate(`/repository/${newRepo._id}`);
        } catch (err) {
            setActionError(
                err.response?.data?.message || "Could not fork repository"
            );
        } finally {
            setIsForking(false);
        }
    };

    const handleFetchForks = async () => {
        setForksLoading(true);
        setForksError("");
        try {
            const forks = await fetchRepositoryForks(id);
            setForksList(forks);
            setForksLoaded(true);
        } catch {
            setForksError("Failed to load forks");
        } finally {
            setForksLoading(false);
        }
    };

    const handleRepositoryUpdated = (updated) => {
        setRepository((prev) => ({
            ...prev,
            ...updated,
            isStarred: prev.isStarred,
            isOwner: prev.isOwner,
            userRole: prev.userRole,
            upstream: prev.upstream,
            forks: updated.forks ?? prev.forks,
            stars: updated.stars ?? prev.stars
        }));
        setStarCount(updated.stars ?? repository.stars);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="repo-loading">
                    <div className="shared-loading">
                        <p>Loading repository…</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        const isNotFound = errorCode === 404;

        return (
            <DashboardLayout>
                <div className="repo-state-block">
                    <div className="shared-error">
                        <p>
                            {isNotFound
                                ? "Repository not found."
                                : error}
                        </p>
                        <Link
                            to="/repositories"
                            className="state-btn"
                        >
                            {isNotFound
                                ? "Browse your repositories"
                                : "Back to repositories"}
                        </Link>
                        {!isNotFound && (
                            <button
                                type="button"
                                className="state-btn"
                                onClick={() =>
                                    setReloadKey((key) => key + 1)
                                }
                            >
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const owner =
        repository.owner &&
        (repository.owner.userName || repository.owner._id)
            ? repository.owner
            : null;

    const canManageSettings =
        repository.isOwner ||
        repository.userRole === "maintainer" ||
        repository.userRole === "owner";

    const canDeleteRepository =
        repository.isOwner || repository.userRole === "owner";

    const canManageBranchProtection = canManageSettings;

    const branchCount =
        realBranchEntries === undefined || realBranchEntries.length === 0
            ? repository.branches && repository.branches.length > 0
                ? repository.branches.length
                : 0
            : realBranchEntries.length;

    /* Real branches from the version-control refs; falls back to the
       repository document's metadata branch names. */
    const branchRows =
        realBranchEntries && realBranchEntries.length > 0
            ? realBranchEntries.map((entry) => ({
                  name: entry.name,
                  isDefault: Boolean(entry.isDefault)
              }))
            : (repository.branches || []).map((name) => ({
                  name,
                  isDefault: false
              }));

    const upstream = repository.upstream;
    const hasForkSource =
        upstream && (upstream.name || upstream.owner?.userName);

    const formatFullDate = (value) => {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }).format(date);
    };

    const visibilityLabel =
        repository.visibility === "private" ? "Private" : "Public";

    const TAB_GROUPS = [
        { id: "code", label: "Code", icon: CodeIcon },
        {
            id: "issues",
            label: "Issues",
            icon: IssueIcon,
            count: openIssues
        },
        {
            id: "pullrequests",
            label: "Pull Requests",
            icon: PullRequestIcon,
            count: openPRs
        }
    ];

    const MORE_TABS = [
        { id: "commits", label: "Commits", icon: GitCommitIcon },
        {
            id: "branches",
            label: "Branches",
            icon: BranchIcon,
            count: branchCount
        },
        { id: "releases", label: "Releases", icon: TagIcon },
        { id: "activity", label: "Activity", icon: ActivityIcon },
        { id: "collaborators", label: "Collaborators", icon: UsersIcon },
        {
            id: "forks",
            label: "Forks",
            icon: ForkIcon,
            count: repository.forks
        }
    ];

    if (canManageSettings) {
        MORE_TABS.push({
            id: "settings",
            label: "Settings",
            icon: SettingsIcon
        });
    }

    const renderTab = (tab) => (
        <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            className={`repo-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
                if (tab.id === "forks" && !forksLoaded && !forksLoading) {
                    handleFetchForks();
                }
                setActiveTab(tab.id);
            }}
        >
            <tab.icon size={14} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
                <span className="repo-tab-count">
                    {tab.count}
                </span>
            )}
        </button>
    );

    return (
        <DashboardLayout>
            <div className="repo-page">
                <header className="repo-header">
                    <div className="repo-heading">
                        <div className="repo-identity">
                            {owner && (
                                <>
                                    <Link
                                        to={`/profile/${owner._id}`}
                                        className="repo-owner-link"
                                    >
                                        {owner.userName ||
                                            owner.name ||
                                            ""}
                                    </Link>
                                    <span
                                        className="repo-owner-slash"
                                        aria-hidden="true"
                                    >
                                        /
                                    </span>
                                </>
                            )}
                            <h1 className="repo-name">{repository.name}</h1>
                            <span
                                className={`repo-visibility repo-visibility--${repository.visibility}`}
                            >
                                {repository.visibility === "public" ? (
                                    <GlobeIcon size={12} />
                                ) : (
                                    <ShieldIcon size={12} />
                                )}
                                {repository.visibility}
                            </span>
                        </div>

                        {hasForkSource && (
                            <p className="repo-fork-source">
                                <ForkIcon size={14} />
                                <span>Forked from </span>
                                {upstream.owner?.userName && (
                                    <Link
                                        to={`/profile/${upstream.owner._id}`}
                                        className="repo-fork-link"
                                    >
                                        {upstream.owner.userName}
                                    </Link>
                                )}
                                {upstream.owner?.userName &&
                                    upstream.name && (
                                        <span
                                            className="repo-fork-sep"
                                            aria-hidden="true"
                                        >
                                            /
                                        </span>
                                    )}
                                {upstream.name && (
                                    <Link
                                        to={`/repository/${upstream._id}`}
                                        className="repo-fork-link"
                                    >
                                        {upstream.name}
                                    </Link>
                                )}
                            </p>
                        )}

                        {repository.description && (
                            <p className="repo-description">
                                {repository.description}
                            </p>
                        )}

                        <div className="repo-meta">
                            <span className="repo-meta-item">
                                <StarIcon size={13} />
                                {repository.stars}
                                <span className="repo-meta-label">
                                    stars
                                </span>
                            </span>
                            <span className="repo-meta-sep" aria-hidden="true" />
                            <span className="repo-meta-item">
                                <ForkIcon size={13} />
                                {repository.forks}
                                <span className="repo-meta-label">
                                    forks
                                </span>
                            </span>
                            <span className="repo-meta-sep" aria-hidden="true" />
                            <span className="repo-meta-item">
                                <BranchIcon size={13} />
                                {branchCount}
                                <span className="repo-meta-label">
                                    branches
                                </span>
                            </span>
                            {repository.updatedAt && (
                                <>
                                    <span
                                        className="repo-meta-sep"
                                        aria-hidden="true"
                                    />
                                    <span className="repo-meta-item">
                                        <ClockIcon size={13} />
                                        <span className="repo-meta-label">
                                            Updated{" "}
                                            {formatRelativeTime(
                                                repository.updatedAt
                                            )}
                                        </span>
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="repo-actions">
                        {canManageSettings && (
                            <button
                                type="button"
                                className="repo-btn"
                                onClick={() => setActiveTab("settings")}
                            >
                                <SettingsIcon size={14} />
                                Settings
                            </button>
                        )}
                        {!repository.isOwner && (
                            <button
                                type="button"
                                className="repo-btn repo-btn--fork"
                                onClick={handleFork}
                                disabled={isForking}
                            >
                                <ForkIcon size={14} />
                                {isForking ? "Forking…" : "Fork"}
                                <span className="repo-btn-count">
                                    {repository.forks}
                                </span>
                            </button>
                        )}
                        <button
                            type="button"
                            className={`repo-btn repo-btn--star ${
                                starred ? "starred" : ""
                            }`}
                            onClick={handleStarToggle}
                            disabled={isStarring}
                            aria-pressed={starred}
                        >
                            {starred ? (
                                <StarFilledIcon size={15} />
                            ) : (
                                <StarIcon size={15} />
                            )}
                            {isStarring
                                ? "…"
                                : starred
                                ? "Unstar"
                                : "Star"}
                            <span className="repo-btn-count">
                                {starCount}
                            </span>
                        </button>
                    </div>
                </header>

                {actionError && (
                    <div className="shared-error repo-action-error">
                        <p>{actionError}</p>
                    </div>
                )}

                <nav
                    className="repo-tabs"
                    role="tablist"
                    aria-label="Repository sections"
                >
                    {TAB_GROUPS.map((tab) => renderTab(tab))}
                    <span className="repo-tabs-divider" aria-hidden="true" />
                    {MORE_TABS.map((tab) => renderTab(tab))}
                </nav>

                <div
                    className="repo-tabpanel"
                    id={`tabpanel-${activeTab}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${activeTab}`}
                >
                    {activeTab === "code" && (
                        <RepositoryBrowser repository={repository} />
                    )}

                    {activeTab === "issues" && (
                        <IssueList repositoryId={repository._id} />
                    )}

                    {activeTab === "pullrequests" && (
                        <PullRequestList
                            repository={repository}
                            isOwner={repository.isOwner}
                            initialNumber={number}
                        />
                    )}

                    {activeTab === "releases" && (
                        <ReleaseList
                            repository={repository}
                            isOwner={repository.isOwner}
                        />
                    )}

                    {activeTab === "branches" && (
                        <div className="repo-section">
                            <div className="repo-section-header">
                                <h2>Branches</h2>
                            </div>
                            {branchRows.length === 0 ? (
                                <div className="shared-empty-state">
                                    <p>No branches found.</p>
                                </div>
                            ) : (
                                <div className="repo-branch-list">
                                    {branchRows.map(({ name, isDefault }) => (
                                        <div
                                            key={name}
                                            className="repo-branch-row"
                                        >
                                            <span className="repo-branch-icon">
                                                <BranchIcon size={15} />
                                            </span>
                                            <span className="repo-branch-name">
                                                {name}
                                            </span>
                                            {isDefault && (
                                                <span className="repo-branch-default">
                                                    default
                                                </span>
                                            )}
                                            {canManageBranchProtection && (
                                                <span className="repo-branch-actions">
                                                    <BranchProtection
                                                        repositoryId={
                                                            repository._id
                                                        }
                                                        branch={name}
                                                    />
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "commits" && (
                        <RepositoryCommits
                            repository={repository}
                            isOwner={repository.isOwner}
                        />
                    )}

                    {activeTab === "activity" && (
                        <RepositoryActivity repository={repository} />
                    )}

                    {activeTab === "collaborators" && (
                        <Collaborators
                            repository={repository}
                            userRole={repository.userRole}
                        />
                    )}

                    {activeTab === "forks" && (
                        <div className="repo-section">
                            <div className="repo-section-header">
                                <h2>Forks</h2>
                            </div>
                            {forksLoading && (
                                <div className="shared-loading">
                                    <p>Loading forks…</p>
                                </div>
                            )}
                            {forksError && (
                                <div className="shared-error">
                                    <p>{forksError}</p>
                                    <button
                                        type="button"
                                        className="state-btn"
                                        onClick={handleFetchForks}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {!forksLoading &&
                                !forksError &&
                                !forksLoaded && (
                                    <div className="shared-empty-state">
                                        <p>
                                            Load the list of forks for this
                                            repository.
                                        </p>
                                        <button
                                            type="button"
                                            className="state-btn"
                                            onClick={handleFetchForks}
                                        >
                                            Load forks
                                        </button>
                                    </div>
                                )}
                            {!forksLoading &&
                                !forksError &&
                                forksLoaded &&
                                forksList.length === 0 && (
                                    <div className="shared-empty-state">
                                        <p>No forks yet.</p>
                                    </div>
                                )}
                            {!forksLoading &&
                                !forksError &&
                                forksList.length > 0 && (
                                    <div className="repo-fork-list">
                                        {forksList.map((fork) => (
                                            <Link
                                                key={fork._id}
                                                to={`/repository/${fork._id}`}
                                                className="repo-fork-row"
                                            >
                                                <span className="repo-fork-icon">
                                                    <ForkIcon size={14} />
                                                </span>
                                                <span className="repo-fork-owner">
                                                    {fork.owner?.userName ||
                                                        ""}
                                                    <span>/</span>
                                                    <strong>{fork.name}</strong>
                                                </span>
                                                <span className="repo-fork-meta">
                                                    <StarIcon size={12} />
                                                    {fork.stars}
                                                    <span className="repo-meta-sep" aria-hidden="true" />
                                                    <ForkIcon size={12} />
                                                    {fork.forks}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                        </div>
                    )}

                    {activeTab === "settings" && canManageSettings && (
                        <div className="repo-settings-layout">
                            <aside className="repo-settings-side">
                                <section
                                    className="repo-info-panel"
                                    aria-label="Repository information"
                                >
                                    <header className="repo-info-panel-header">
                                        <h3>Repository information</h3>
                                    </header>
                                    <dl className="repo-info-list">
                                        <div className="repo-info-row">
                                            <dt>Visibility</dt>
                                            <dd>{visibilityLabel}</dd>
                                        </div>
                                        <div className="repo-info-row">
                                            <dt>Created</dt>
                                            <dd>
                                                {formatFullDate(
                                                    repository.createdAt
                                                )}
                                            </dd>
                                        </div>
                                        <div className="repo-info-row">
                                            <dt>Updated</dt>
                                            <dd>
                                                {formatFullDate(
                                                    repository.updatedAt
                                                )}
                                            </dd>
                                        </div>
                                        <div className="repo-info-row">
                                            <dt>Branches</dt>
                                            <dd>{branchCount}</dd>
                                        </div>
                                    </dl>
                                </section>
                            </aside>

                            <div className="repo-settings-main">
                                <RepositorySettings
                                    repository={repository}
                                    canDelete={canDeleteRepository}
                                    onUpdated={handleRepositoryUpdated}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default RepositoryPage;