import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import ActivityItem from "../components/activity/ActivityItem";
import StateBlock from "../components/ui/StateBlock";
import {
    RepoIcon,
    IssueIcon,
    BranchIcon,
    StarFilledIcon
} from "../components/ui/icons";
import { fetchRepositories } from "../api/repositoryApi";
import { fetchActivity } from "../api/activityApi";
import { getUserProfile } from "../api/userApi";
import { useAuth } from "../context/AuthContext";

import "../styles/dashboard.css";
import "../styles/profile.css";

const PROFILE_TABS = ["overview", "repositories", "stars", "activity"];
const TAB_LABELS = {
    overview: "Overview",
    repositories: "Repositories",
    stars: "Stars",
    activity: "Activity"
};

const Dashboard = () => {
    const { user } = useAuth();

    const [tab, setTab] = useState("overview");
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState("");

    const [repositories, setRepositories] = useState([]);
    const [reposLoading, setReposLoading] = useState(true);
    const [reposError, setReposError] = useState("");

    const [activities, setActivities] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [activityError, setActivityError] = useState("");

    const navigate = useNavigate();

    const loadProfile = async () => {
        setProfileLoading(true);
        setProfileError("");
        try {
            const data = await getUserProfile(user._id);
            setProfile(data);
        } catch (err) {
            setProfileError(
                err.response?.data?.message || "Failed to load profile"
            );
        } finally {
            setProfileLoading(false);
        }
    };

    const loadRepositories = async () => {
        setReposLoading(true);
        setReposError("");
        try {
            const data = await fetchRepositories();
            setRepositories(data);
        } catch {
            setReposError("Failed to load repositories");
        } finally {
            setReposLoading(false);
        }
    };

    const loadActivity = async () => {
        setActivityLoading(true);
        setActivityError("");
        try {
            const data = await fetchActivity({
                actor: user._id,
                limit: 20
            });
            setActivities(data.activities || []);
        } catch {
            setActivityError("Failed to load activity");
        } finally {
            setActivityLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
        loadRepositories();
        loadActivity();
    }, [user._id]);

    const starredRepos = profile?.starRepo || [];

    const renderProfileCard = () => {
        if (profileLoading) {
            return (
                <StateBlock variant="loading" message="Loading profile..." />
            );
        }

        if (profileError) {
            return (
                <StateBlock
                    variant="error"
                    message={profileError}
                    retry={loadProfile}
                />
            );
        }

        if (!profile) {
            return null;
        }

        const initials = profile.userName
            ? profile.userName.slice(0, 2).toUpperCase()
            : "??";

        return (
            <div className="profile-header">
                <div className="profile-avatar">{initials}</div>
                <div className="profile-info">
                    <h2 className="profile-name">
                        {profile.name || profile.userName}
                    </h2>
                    <p className="profile-username">
                        @{profile.userName}
                    </p>
                    {profile.bio && (
                        <p className="profile-bio">{profile.bio}</p>
                    )}
                    <div className="profile-stats">
                        <div className="profile-stat">
                            <span className="profile-stat-value">
                                {profile.followers}
                            </span>
                            <span className="profile-stat-label">followers</span>
                        </div>
                        <div className="profile-stat">
                            <span className="profile-stat-value">
                                {profile.followedUsers?.length || 0}
                            </span>
                            <span className="profile-stat-label">following</span>
                        </div>
                        <div className="profile-stat">
                            <span className="profile-stat-value">
                                {repositories.length}
                            </span>
                            <span className="profile-stat-label">Repositories</span>
                        </div>
                    </div>
                </div>
                <div className="repo-actions">
                    <button
                        type="button"
                        className="btn outline small"
                        onClick={() => navigate("/settings")}
                    >
                        Edit profile
                    </button>
                    <button
                        type="button"
                        className="btn primary small"
                        onClick={() => navigate("/new")}
                    >
                        New repository
                    </button>
                </div>
            </div>
        );
    };

    const renderTabBar = () => (
        <div className="repo-tabs" role="tablist">
            {PROFILE_TABS.map((name) => (
                <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={tab === name}
                    className={tab === name ? "repo-tab active" : "repo-tab"}
                    onClick={() => setTab(name)}
                >
{TAB_LABELS[name] || name}
                </button>
            ))}
        </div>
    );

    const renderOverview = () => (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <h1>Overview</h1>
                    <p className="dashboard-header-sub">
                        Your repository at a glance.
                    </p>
                </div>
            </div>

            <div className="dashboard-stats">
                <div className="dashboard-stat">
                    <div className="dashboard-stat-label">Repositories</div>
                    <div className="dashboard-stat-value">
                        {repositories.length}
                    </div>
                </div>
                <div className="dashboard-stat">
                    <div className="dashboard-stat-label">Pull requests</div>
                    <div className="dashboard-stat-value">
                        {repositories.reduce(
                            (acc, repo) => acc + (repo.prCount || 0),
                            0
                        )}
                    </div>
                </div>
                <div className="dashboard-stat">
                    <div className="dashboard-stat-label">Issues</div>
                    <div className="dashboard-stat-value">
                        {repositories.reduce(
                            (acc, repo) => acc + (repo.openIssues || 0),
                            0
                        )}
                    </div>
                </div>
                <div className="dashboard-stat">
                    <div className="dashboard-stat-label">Branches</div>
                    <div className="dashboard-stat-value">
                        {repositories.reduce(
                            (acc, repo) => acc + (repo.branches?.length || 0),
                            0
                        )}
                    </div>
                </div>
            </div>

            <div className="dashboard-layout">
                <section>
                    <div className="dashboard-repos-header">
                        <h2>Your repositories</h2>
                        <button
                            className="btn ghost small"
                            onClick={() => navigate("/repositories")}
                        >
                            View all
                        </button>
                    </div>

                    {reposLoading && (
                        <StateBlock
                            variant="loading"
                            message="Loading repositories..."
                        />
                    )}
                    {reposError && (
                        <StateBlock
                            variant="error"
                            message={reposError}
                            retry={loadRepositories}
                        />
                    )}

                    <div className="dashboard-repo-list">
                        {repositories.length === 0 && !reposLoading && !reposError && (
                            <StateBlock
                                variant="empty"
                                message="No repositories found. Start by creating your first one!"
                                action={{
                                    label: "Create repository",
                                    onClick: () => navigate("/new")
                                }}
                            />
                        )}

                        {repositories.slice(0, 8).map((repo) => (
                            <Link
                                className="dashboard-repo-item"
                                key={repo._id}
                                to={`/repository/${repo._id}`}
                            >
                                <span className="dashboard-repo-icon">
                                    <RepoIcon size={15} />
                                </span>
                                <div className="dashboard-repo-info">
                                    <span className="dashboard-repo-name">
                                        {repo.name}
                                    </span>
                                    <span className="dashboard-repo-desc">
                                        {repo.description ||
                                            "No description provided."}
                                    </span>
                                </div>
                                <div className="dashboard-repo-meta">
                                    <span className="dashboard-repo-stat">
                                        <StarFilledIcon size={12} />
                                        {repo.stars || 0}
                                    </span>
                                    <span className="dashboard-repo-stat">
                                        <IssueIcon size={12} />
                                        {repo.openIssues || 0}
                                    </span>
                                    <span className="dashboard-repo-stat">
                                        <BranchIcon size={12} />
                                        {repo.branches?.length || 0}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                <aside className="dashboard-activity-panel">
                    <div className="dashboard-activity-header">
                        <h3>Recent activity</h3>
                        <button
                            className="btn ghost small"
                            onClick={() => navigate("/activity")}
                        >
                            View all
                        </button>
                    </div>
                    {activityLoading && (
                        <StateBlock variant="loading" message="Loading activity..." />
                    )}
                    {activityError && (
                        <StateBlock
                            variant="error"
                            message={activityError}
                            retry={loadActivity}
                        />
                    )}
                    {!activityLoading && !activityError && activities.length === 0 && (
                        <StateBlock
                            variant="empty"
                            message="No activity yet."
                        />
                    )}
                    <div className="dashboard-activity-list">
                        {activities.slice(0, 8).map((activity) => (
<ActivityItem
                            key={activity._id}
                            activity={activity}
                        />
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );

    const renderAllRepositories = () => {
        if (reposLoading) {
            return <StateBlock variant="loading"                             message="Loading repositories..." />;
        }
        if (reposError) {
            return (
                <StateBlock
                    variant="error"
                    message={reposError}
                    retry={loadRepositories}
                />
            );
        }
        return (
            <div className="dashboard-repo-list">
                {repositories.length === 0 && (
                    <StateBlock
                        variant="empty"
                            message="No repositories yet."
                        action={{
                            label: "Create repository",
                            onClick: () => navigate("/new")
                        }}
                    />
                )}
                {repositories.map((repo) => (
                    <Link
                        key={repo._id}
                        to={`/repository/${repo._id}`}
                        className="dashboard-repo-item"
                    >
                        <span className="dashboard-repo-icon">
                            <RepoIcon size={15} />
                        </span>
                        <div className="dashboard-repo-info">
                            <span className="dashboard-repo-name">
                                {repo.name}
                            </span>
                            <span className="dashboard-repo-desc">
                                {repo.description || "No description provided."}
                            </span>
                        </div>
                        <div className="dashboard-repo-meta">
                            <span className="dashboard-repo-stat">
                                <StarFilledIcon size={12} /> {repo.stars || 0}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    const renderStars = () => {
        if (profileLoading) {
            return <StateBlock variant="loading" message="Loading stars..." />;
        }
        if (profileError) {
            return (
                <StateBlock
                    variant="error"
                    message={profileError}
                    retry={loadProfile}
                />
            );
        }
        return (
            <div className="dashboard-repo-list">
                {starredRepos.length === 0 && (
                    <StateBlock
                        variant="empty"
                            message="Repositories you star will appear here."
                    />
                )}
                {starredRepos.map((repo) => (
                    <Link
                        key={repo._id}
                        to={`/repository/${repo._id}`}
                        className="dashboard-repo-item"
                    >
                        <span className="dashboard-repo-icon">
                            <RepoIcon size={15} />
                        </span>
                        <div className="dashboard-repo-info">
                            <span className="dashboard-repo-name">
                                {repo.name}
                            </span>
                        </div>
                        <div className="dashboard-repo-meta">
                            <span className="dashboard-repo-stat">
                                <StarFilledIcon size={12} /> {repo.stars || 0}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    const renderActivity = () => {
        if (activityLoading) {
            return <StateBlock variant="loading" message="Loading activity..." />;
        }
        if (activityError) {
            return (
                <StateBlock
                    variant="error"
                    message={activityError}
                    retry={loadActivity}
                />
            );
        }
        if (activities.length === 0) {
            return (
                <StateBlock
                    variant="empty"
                    message="No activity yet."
                />
            );
        }
        return (
            <div className="activity-list">
                {activities.map((activity) => (
                    <ActivityItem
                        key={activity._id}
                        activity={activity}
                    />
                ))}
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="profile-page">
                {renderProfileCard()}

                {renderTabBar()}

                {tab === "overview" && renderOverview()}
                {tab === "repositories" && renderAllRepositories()}
                {tab === "stars" && renderStars()}
                {tab === "activity" && renderActivity()}
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;