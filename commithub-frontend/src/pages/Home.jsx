import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import StateBlock from "../components/ui/StateBlock";
import { useAuth } from "../context/AuthContext";
import {
    ActivityIcon,
    RepoIcon,
    IssueIcon,
    PullRequestIcon,
    BuildingIcon,
    ChevronRightIcon,
    StarIcon,
    ForkIcon,
    UsersIcon,
    GitCommitIcon,
    MessageIcon,
    TagIcon
} from "../components/ui/icons";
import {
    buildActivityText,
    formatRelativeTime,
    activityTone
} from "../utils/activityUtils";
import { fetchActivity } from "../api/activityApi";
import { fetchDiscover } from "../api/discoverApi";
import {
    fetchRepositories,
    fetchCollaboratingRepositories,
    fetchPullRequests
} from "../api/repositoryApi";
import { getIssues } from "../api/issueApi";

import "../styles/home.css";

/* ---------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */

const toInitials = (name) =>
    name ? name.slice(0, 2).toUpperCase() : "??";

const truncate = (text, max) =>
    text && text.length > max
        ? `${text.slice(0, max).trimEnd()}…`
        : text;

/* Deep link to the actual target of an activity event. Every id below
   comes from the activity record itself (the real repository, issue, or
   pull request), never from the signed-in user's identity. */
const feedTarget = (activity) => {
    const repoId =
        activity.repository?._id || activity.repository || null;
    const issueId = activity.issue?._id || null;
    const prNumber =
        activity.metadata?.pullRequestNumber ??
        activity.pullRequest?.number ??
        null;

    switch (activity.type) {
        case "ISSUE_CREATED":
        case "ISSUE_COMMENTED":
            if (issueId) {
                return `/issues/${issueId}`;
            }
            return repoId ? `/repository/${repoId}` : null;
        case "PR_CREATED":
        case "PR_COMMENTED":
        case "PR_REVIEWED":
        case "PR_APPROVED":
        case "PR_CHANGES_REQUESTED":
        case "PR_MERGED":
        case "PR_CLOSED":
        case "PR_REOPENED":
            if (repoId && prNumber) {
                return `/repository/${repoId}/pull-request/${prNumber}`;
            }
            return repoId ? `/repository/${repoId}` : null;
        default:
            return repoId ? `/repository/${repoId}` : null;
    }
};

const parentOf = (repository) =>
    repository?.owner?.userName
        ? `${repository.owner.userName}/`
        : "";

const eventIconFor = (tone, size = 13) => {
    switch (tone) {
        case "star":
            return <StarIcon size={size} />;
        case "fork":
        case "branch":
            return <ForkIcon size={size} />;
        case "issue":
            return <IssueIcon size={size} />;
        case "pr":
            return <PullRequestIcon size={size} />;
        case "commit":
            return <GitCommitIcon size={size} />;
        case "release":
            return <TagIcon size={size} />;
        case "collaborator":
            return <UsersIcon size={size} />;
        case "comment":
            return <MessageIcon size={size} />;
        default:
            return <RepoIcon size={size} />;
    }
};

const updatedLabel = (repository) => {
    const timestamp = repository.updatedAt || repository.createdAt;

    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
        return "Updated just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(seconds / 3600);

    if (hours < 24) {
        return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days = Math.floor(hours / 24);

    if (days === 1) {
        return "Updated yesterday";
    }

    if (days < 7) {
        return `Updated ${days} days ago`;
    }

    return `Updated on ${date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...(date.getFullYear() !== now.getFullYear()
            ? { year: "numeric" }
            : {})
    })}`;
};

/* Repositories the user owns or collaborates on — the same set the Issues
   and Pull Requests pages use. Capped by most-recently-updated so the home
   overview stays cheap while still showing real data. */
const loadTrackedRepositories = async ({ userName }) => {
    const [owned, collaborating] = await Promise.all([
        fetchRepositories(),
        fetchCollaboratingRepositories()
    ]);

    const ownedIds = new Set(
        owned.map((repository) => String(repository._id))
    );
    const byId = new Map();

    for (const repository of [...owned, ...collaborating]) {
        if (repository?._id && !byId.has(repository._id)) {
            const isOwned = ownedIds.has(String(repository._id));
            byId.set(repository._id, {
                ...repository,
                /* Collaborating repos carry their real owner from the API.
                   Owned repos are owned by the signed-in user by definition
                   (GET /repositories returns owner: self), so that name is
                   only ever used for the current user's own resources. */
                repoOwner:
                    repository.owner?.userName || (isOwned ? userName : null),
                _sort: repository.updatedAt || repository.createdAt || 0
            });
        }
    }

    return Array.from(byId.values())
        .sort((a, b) => (b._sort > a._sort ? 1 : -1))
        .slice(0, 10);
};

/* ---------------------------------------------------------------------------
   Activity event row
   ------------------------------------------------------------------------- */

const FeedRow = ({ activity }) => {
    const navigate = useNavigate();
    const target = feedTarget(activity);

    const actorId = activity.actor?._id || activity.actor || null;
    const actorName =
        activity.actor?.userName || activity.actor?.name || "Someone";
    const text = buildActivityText(activity) || "took an action";

    const tone = activityTone(activity.type);

    const repository = activity.repository;
    const repoId = repository?._id || repository || null;
    const repoLabel = repository?.name || "repository";

    const open = () => {
        if (target) {
            navigate(target);
        }
    };

    const stop = (e) => e.stopPropagation();

    return (
        <li
            className={`home-event${target ? "" : " no-target"}`}
            role={target ? "link" : undefined}
            tabIndex={target ? 0 : undefined}
            onClick={open}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) {
                    return;
                }
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            }}
        >
            <Link
                to={actorId ? `/profile/${actorId}` : "#"}
                className="home-event-avatar"
                tabIndex={actorId ? 0 : -1}
                aria-hidden={actorId ? undefined : true}
                onClick={stop}
            >
                {toInitials(activity.actor?.userName || actorName)}
            </Link>

            <div className="home-event-body">
                <p className="home-event-text">
                    <span
                        className="home-event-tone"
                        aria-hidden="true"
                    >
                        {eventIconFor(tone)}
                    </span>
                    <span className="home-event-line">
                        <Link
                            to={actorId ? `/profile/${actorId}` : undefined}
                            className="home-event-actor"
                            onClick={stop}
                        >
                            {actorName}
                        </Link>{" "}
                        {text}
                    </span>
                </p>

                <div className="home-event-meta">
                    {repoId && (
                        <Link
                            to={`/repository/${repoId}`}
                            className="home-event-repo"
                            onClick={stop}
                        >
                            <RepoIcon size={11} />
                            {parentOf(repository)}
                            {repoLabel}
                        </Link>
                    )}
                    <time>{formatRelativeTime(activity.createdAt)}</time>
                </div>
            </div>
        </li>
    );
};

/* ---------------------------------------------------------------------------
   Page
   ------------------------------------------------------------------------- */

const Home = () => {
    const { user } = useAuth();

    const [activities, setActivities] = useState([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [feedError, setFeedError] = useState("");

    const [repositories, setRepositories] = useState([]);
    const [reposLoading, setReposLoading] = useState(true);
    const [reposError, setReposError] = useState("");

    const [issues, setIssues] = useState([]);
    const [issuesLoading, setIssuesLoading] = useState(true);
    const [issuesError, setIssuesError] = useState("");

    const [pullRequests, setPullRequests] = useState([]);
    const [prsLoading, setPrsLoading] = useState(true);
    const [prsError, setPrsError] = useState("");

    const [discover, setDiscover] = useState({
        organizations: [],
        newUsers: []
    });
    const [discoverLoading, setDiscoverLoading] = useState(true);
    const [discoverError, setDiscoverError] = useState("");

    const loadFeed = async () => {
        setFeedLoading(true);
        setFeedError("");
        try {
            const data = await fetchActivity({ limit: 30 });
            setActivities(data.activities || []);
        } catch (err) {
            setFeedError(
                err.response?.data?.message || "Failed to load activity"
            );
        } finally {
            setFeedLoading(false);
        }
    };

    const loadRepositories = async () => {
        setReposLoading(true);
        setReposError("");
        try {
            const data = await fetchRepositories();
            setRepositories(Array.isArray(data) ? data : []);
        } catch (err) {
            setReposError(
                err.response?.data?.message ||
                    "Failed to load repositories"
            );
        } finally {
            setReposLoading(false);
        }
    };

    const loadIssues = async () => {
        setIssuesLoading(true);
        setIssuesError("");
        try {
            const repos = await loadTrackedRepositories({
                userName: user?.userName
            });
            const arrays = await Promise.all(
                repos.map(async (repository) => {
                    try {
                        const data = await getIssues(repository._id);
                        return (data.issues || []).map((issue) => ({
                            ...issue,
                            repoId: repository._id,
                            repoName: repository.name,
                            repoOwner: repository.repoOwner
                        }));
                    } catch {
                        return [];
                    }
                })
            );
            setIssues(
                arrays
                    .flat()
                    .sort((a, b) =>
                        (b.createdAt || "") > (a.createdAt || "") ? 1 : -1
                    )
                    .slice(0, 5)
            );
        } catch (err) {
            setIssuesError(
                err.response?.data?.message || "Failed to load issues"
            );
        } finally {
            setIssuesLoading(false);
        }
    };

    const loadPullRequests = async () => {
        setPrsLoading(true);
        setPrsError("");
        try {
            const repos = await loadTrackedRepositories({
                userName: user?.userName
            });
            const arrays = await Promise.all(
                repos.map(async (repository) => {
                    try {
                        const data = await fetchPullRequests(
                            repository._id,
                            {}
                        );
                        return (data.pullRequests || []).map((pr) => ({
                            ...pr,
                            repoId: repository._id,
                            repoName: repository.name,
                            repoOwner: repository.repoOwner
                        }));
                    } catch {
                        return [];
                    }
                })
            );
            setPullRequests(
                arrays
                    .flat()
                    .sort((a, b) =>
                        (b.createdAt || "") > (a.createdAt || "") ? 1 : -1
                    )
                    .slice(0, 5)
            );
        } catch (err) {
            setPrsError(
                err.response?.data?.message || "Failed to load pull requests"
            );
        } finally {
            setPrsLoading(false);
        }
    };

    const loadDiscover = async () => {
        setDiscoverLoading(true);
        setDiscoverError("");
        try {
            const data = await fetchDiscover();
            setDiscover({
                organizations: data.organizations || [],
                newUsers: data.newUsers || []
            });
        } catch (err) {
            setDiscoverError(
                err.response?.data?.message || "Failed to load discovery"
            );
        } finally {
            setDiscoverLoading(false);
        }
    };

    useEffect(() => {
        loadFeed();
        loadRepositories();
        loadIssues();
        loadPullRequests();
        loadDiscover();
    }, []);

    return (
        <DashboardLayout>
            <div className="home">
                {/* ── Heading ─────────────────────────────────────── */}

                <header className="home-head">
                    <h1 className="home-title">Home</h1>
                    <p className="home-subtitle">
                        Welcome back, {user?.name || user?.userName}.
                    </p>
                </header>

                {/* ── Activity + work overview ─────────────────────── */}

                <div className="home-grid">
                    <section
                        className="home-feed"
                        aria-label="Recent activity"
                    >
                        <div className="home-section-header">
                            <ActivityIcon size={15} />
                            <span>Recent activity</span>
                            <Link
                                to="/activity"
                                className="home-section-link"
                            >
                                View all
                                <ChevronRightIcon size={13} />
                            </Link>
                        </div>

                        {feedLoading && (
                            <StateBlock
                                variant="loading"
                                message="Loading activity…"
                            />
                        )}

                        {feedError && (
                            <StateBlock
                                variant="error"
                                message={feedError}
                                retry={loadFeed}
                            />
                        )}

                        {!feedLoading &&
                            !feedError &&
                            activities.length === 0 && (
                                <StateBlock
                                    variant="empty"
                                    message="No recent activity yet."
                                />
                            )}

                        {!feedLoading &&
                            !feedError &&
                            activities.length > 0 && (
                                <ul className="home-feed-list">
                                    {activities
                                        .slice(0, 15)
                                        .map((activity) => (
                                            <FeedRow
                                                key={activity._id}
                                                activity={activity}
                                            />
                                        ))}
                                </ul>
                            )}
                    </section>

                    <aside className="home-side">
                        {/* Repositories */}

                        <section
                            className="home-panel"
                            aria-label="Your repositories"
                        >
                            <div className="home-section-header">
                                <RepoIcon size={15} />
                                <span>Your repositories</span>
                                <Link
                                    to="/repositories"
                                    className="home-section-link"
                                >
                                    View all
                                    <ChevronRightIcon size={13} />
                                </Link>
                            </div>

                            {reposLoading && (
                                <StateBlock
                                    variant="loading"
                                    message="Loading repositories…"
                                />
                            )}

                            {reposError && (
                                <StateBlock
                                    variant="error"
                                    message={reposError}
                                    retry={loadRepositories}
                                />
                            )}

                            {!reposLoading &&
                                !reposError &&
                                repositories.length === 0 && (
                                    <StateBlock
                                        variant="empty"
                                        message="No repositories yet."
                                    />
                                )}

                            {!reposLoading &&
                                !reposError &&
                                repositories.length > 0 && (
                                    <ul className="home-panel-list">
                                        {repositories
                                            .slice(0, 6)
                                            .map((repository) => (
                                                <li key={repository._id}>
                                                    <Link
                                                        to={`/repository/${repository._id}`}
                                                        className="home-repo-row"
                                                    >
                                                        <span className="home-repo-row-top">
                                                            <span className="home-repo-row-name">
                                                                {repository.name}
                                                            </span>
                                                            <span
                                                                className={`home-repo-visibility ${repository.visibility}`}
                                                            >
                                                                {repository.visibility ===
                                                                "private"
                                                                    ? "Private"
                                                                    : "Public"}
                                                            </span>
                                                        </span>
                                                        {repository.description && (
                                                            <span className="home-repo-row-desc">
                                                                {truncate(
                                                                    repository.description,
                                                                    80
                                                                )}
                                                            </span>
                                                        )}
                                                        <span className="home-repo-row-meta mono">
                                                            <span>
                                                                <StarIcon
                                                                    size={11}
                                                                />{" "}
                                                                {repository.stars ||
                                                                    0}
                                                            </span>
                                                            <span>
                                                                <ForkIcon
                                                                    size={11}
                                                                />{" "}
                                                                {repository.forks ||
                                                                    0}
                                                            </span>
                                                            <span>
                                                                {updatedLabel(
                                                                    repository
                                                                )}
                                                            </span>
                                                        </span>
                                                    </Link>
                                                </li>
                                            ))}
                                    </ul>
                                )}
                        </section>

                        {/* Issues */}

                        <section
                            className="home-panel"
                            aria-label="Open issues"
                        >
                            <div className="home-section-header">
                                <IssueIcon size={15} />
                                <span>Issues</span>
                                <Link
                                    to="/issues"
                                    className="home-section-link"
                                >
                                    View all
                                    <ChevronRightIcon size={13} />
                                </Link>
                            </div>

                            {issuesLoading && (
                                <StateBlock
                                    variant="loading"
                                    message="Loading issues…"
                                />
                            )}

                            {issuesError && (
                                <StateBlock
                                    variant="error"
                                    message={issuesError}
                                    retry={loadIssues}
                                />
                            )}

                            {!issuesLoading &&
                                !issuesError &&
                                issues.length === 0 && (
                                    <StateBlock
                                        variant="empty"
                                        message="No issues yet."
                                    />
                                )}

                            {!issuesLoading &&
                                !issuesError &&
                                issues.length > 0 && (
                                    <ul className="home-panel-list">
                                        {issues.map((issue) => (
                                            <li key={issue._id}>
                                                <Link
                                                    to={`/issues/${issue._id}`}
                                                    className="home-sub-row"
                                                >
                                                    <span className="home-sub-row-title">
                                                        {issue.title}
                                                    </span>
                                                    <span className="home-sub-row-meta mono">
                                                        <span
                                                            className={`home-status-chip ${
                                                                issue.status ||
                                                                ""
                                                            }`}
                                                        >
                                                            {issue.status ||
                                                                "open"}
                                                        </span>
                                                        <span>
                                                            {issue.repoOwner
                                                                ? `${issue.repoOwner}/${issue.repoName}`
                                                                : issue.repoName}
                                                        </span>
                                                        <span>
                                                            {formatRelativeTime(
                                                                issue.createdAt
                                                            )}
                                                        </span>
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </section>

                        {/* Pull requests */}

                        <section
                            className="home-panel"
                            aria-label="Pull requests"
                        >
                            <div className="home-section-header">
                                <PullRequestIcon size={15} />
                                <span>Pull requests</span>
                                <Link
                                    to="/pull-requests"
                                    className="home-section-link"
                                >
                                    View all
                                    <ChevronRightIcon size={13} />
                                </Link>
                            </div>

                            {prsLoading && (
                                <StateBlock
                                    variant="loading"
                                    message="Loading pull requests…"
                                />
                            )}

                            {prsError && (
                                <StateBlock
                                    variant="error"
                                    message={prsError}
                                    retry={loadPullRequests}
                                />
                            )}

                            {!prsLoading &&
                                !prsError &&
                                pullRequests.length === 0 && (
                                    <StateBlock
                                        variant="empty"
                                        message="No pull requests yet."
                                    />
                                )}

                            {!prsLoading &&
                                !prsError &&
                                pullRequests.length > 0 && (
                                    <ul className="home-panel-list">
                                        {pullRequests.map((pr) => (
                                            <li key={pr._id}>
                                                <Link
                                                    to={`/repository/${pr.repoId}/pull-request/${pr.number}`}
                                                    className="home-sub-row"
                                                >
                                                    <span className="home-sub-row-title">
                                                        <span className="home-sub-row-number mono">
                                                            #{pr.number}
                                                        </span>{" "}
                                                        {pr.title}
                                                    </span>
                                                    <span className="home-sub-row-meta mono">
                                                        <span
                                                            className={`home-status-chip ${
                                                                pr.status ||
                                                                ""
                                                            }`}
                                                        >
                                                            {pr.status ||
                                                                "open"}
                                                        </span>
                                                        <span>
                                                            {pr.repoOwner
                                                                ? `${pr.repoOwner}/${pr.repoName}`
                                                                : pr.repoName}
                                                        </span>
                                                        <span>
                                                            {formatRelativeTime(
                                                                pr.createdAt
                                                            )}
                                                        </span>
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </section>
                    </aside>
                </div>

                {/* ── Organizations + developers ─────────────────────── */}

                <div className="home-band">
                    <section
                        className="home-orgs"
                        aria-label="Organizations"
                    >
                        <div className="home-section-header">
                            <BuildingIcon size={15} />
                            <span>Organizations</span>
                        </div>

                        {discoverLoading && (
                            <div className="home-band-state">
                                Loading organizations…
                            </div>
                        )}

                        {discoverError && (
                            <div className="home-band-state error">
                                {discoverError}
                            </div>
                        )}

                        {!discoverLoading &&
                            !discoverError &&
                            discover.organizations.length === 0 && (
                                <div className="home-band-state">
                                    No public organizations yet.
                                </div>
                            )}

                        {!discoverLoading &&
                            !discoverError &&
                            discover.organizations.length > 0 && (
                                <div className="home-chip-row">
                                    {discover.organizations
                                        .slice(0, 6)
                                        .map((organization) => (
                                            <Link
                                                key={organization._id}
                                                to={`/organization/${organization.slug}`}
                                                className="home-chip"
                                            >
                                                <span className="home-chip-name">
                                                    {organization.name}
                                                </span>
                                                {organization.memberCount > 0 && (
                                                    <span className="home-chip-meta mono">
                                                        {organization.memberCount}{" "}
                                                        member
                                                        {organization.memberCount ===
                                                        1
                                                            ? ""
                                                            : "s"}
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                </div>
                            )}
                    </section>

                    <section
                        className="home-developers"
                        aria-label="Developers"
                    >
                        <div className="home-section-header">
                            <UsersIcon size={15} />
                            <span>Developers to explore</span>
                        </div>

                        {discoverLoading && (
                            <div className="home-band-state">
                                Loading developers…
                            </div>
                        )}

                        {discoverError && (
                            <div className="home-band-state error">
                                {discoverError}
                            </div>
                        )}

                        {!discoverLoading &&
                            !discoverError &&
                            discover.newUsers.length === 0 && (
                                <div className="home-band-state">
                                    No developers to show yet.
                                </div>
                            )}

                        {!discoverLoading &&
                            !discoverError &&
                            discover.newUsers.length > 0 && (
                                <ul className="home-developer-list">
                                    {discover.newUsers
                                        .slice(0, 6)
                                        .map((person) => (
                                            <li key={person._id}>
                                                <Link
                                                    to={`/profile/${person._id}`}
                                                    className="home-developer-row"
                                                >
                                                    <span className="home-developer-avatar">
                                                        {toInitials(
                                                            person.userName
                                                        )}
                                                    </span>
                                                    <span className="home-developer-info">
                                                        <span className="home-developer-name">
                                                            {person.name ||
                                                                person.userName}
                                                        </span>
                                                        <span className="home-developer-handle mono">
                                                            @{person.userName}
                                                        </span>
                                                        {person.bio && (
                                                            <span className="home-developer-bio">
                                                                {truncate(
                                                                    person.bio,
                                                                    60
                                                                )}
                                                            </span>
                                                        )}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                </ul>
                            )}
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Home;