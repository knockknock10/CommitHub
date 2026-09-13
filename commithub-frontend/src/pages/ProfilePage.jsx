import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
    RepoIcon,
    StarIcon
} from "../components/ui/icons";
import {
    buildActivityText,
    formatRelativeTime
} from "../utils/activityUtils";
import { getUserProfile } from "../api/userApi";
import { fetchActivity } from "../api/activityApi";
import "../styles/profile.css";

const PROFILE_TABS = ["overview", "repositories", "stars", "activity"];
const TAB_LABELS = {
    overview: "Overview",
    repositories: "Repositories",
    stars: "Stars",
    activity: "Activity"
};

const verbForActivity = (activity) => {
    const raw = buildActivityText(activity);
    return raw
        .replace("opened pull request", "opened pull request")
        .replace("commented on pull request", "commented on pull request")
        .replace("reviewed pull request", "reviewed pull request")
        .replace("merged pull request", "merged pull request")
        .replace("opened issue", "opened issue")
        .replace("commented on issue", "commented on issue")
        .replace("created repository", "created repository")
        .replace("starred repository", "starred repository");
};

const targetLinkOf = (activity) => {
    const repoId = activity.repository?._id || activity.targetRepo?._id || activity.repo?._id || null;
    const issueId = activity.issue?._id;
    const prNumber = activity.metadata?.pullRequestNumber;

    switch (activity.type) {
        case "ISSUE_CREATED":
        case "ISSUE_COMMENTED":
            return issueId ? `/issues/${issueId}` : repoId ? `/repository/${repoId}` : null;
        case "PR_CREATED":
        case "PR_COMMENTED":
        case "PR_REVIEWED":
        case "PR_MERGED":
            return repoId && prNumber ? `/repository/${repoId}/pull-request/${prNumber}` : repoId ? `/repository/${repoId}` : null;
        default:
            return repoId ? `/repository/${repoId}` : null;
    }
};

const RepoItem = ({ repo }) => (
    <Link to={`/repository/${repo._id}`} className="profile-repo-item">
        <div className="profile-repo-icon">
            <RepoIcon size={16} />
        </div>
        <div className="profile-repo-info">
            <span className="profile-repo-name">{repo.name}</span>
            <div className="profile-repo-meta">
                <span className="profile-repo-visibility">
                    {repo.visibility === "private" ? "Private" : "Public"}
                </span>
                <span className="profile-repo-stat">
                    <StarIcon size={12} /> {repo.stars || 0}
                </span>
            </div>
        </div>
    </Link>
);

const ActivityItem = ({ activity }) => {
    const link = targetLinkOf(activity);
    const verb = verbForActivity(activity);

    const content = (
        <div className="profile-activity-item">
            <div className="profile-activity-dot" />
            <div className="profile-activity-text">
                {verb}
                <time className="profile-activity-time">
                    {formatRelativeTime(activity.createdAt)}
                </time>
            </div>
        </div>
    );

    return link ? <Link to={link}>{content}</Link> : <div>{content}</div>;
};

const ProfilePage = () => {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activities, setActivities] = useState([]);
    const [tab, setTab] = useState("overview");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [profileData, activityData] = await Promise.all([
                    getUserProfile(id),
                    fetchActivity({ actor: id, limit: 30 })
                ]);
                setProfile(profileData);
                setActivities(activityData.activities || []);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load profile.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    if (loading) return <div className="shared-loading"><p>Loading profile...</p></div>;
    if (error) return <div className="shared-error"><p>{error}</p></div>;
    if (!profile) return <div className="shared-empty-state"><p>Profile not found.</p></div>;

    const initials = profile.userName ? profile.userName.slice(0, 2).toUpperCase() : "??";

    return (
        <DashboardLayout>
            <div className="profile-page">
                <header className="profile-header">
                    <div className="profile-avatar">{initials}</div>
                    <div className="profile-info">
                        <h1 className="profile-name">{profile.name || profile.userName}</h1>
                        <span className="profile-username">@{profile.userName}</span>
                        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                        <div className="profile-stats">
                            <div className="profile-stat">
                                <span className="profile-stat-value">{profile.repositories?.length || 0}</span>
                                <span className="profile-stat-label">Repositories</span>
                            </div>
                            <div className="profile-stat">
                                <span className="profile-stat-value">{profile.starRepo?.length || 0}</span>
                                <span className="profile-stat-label">Stars</span>
                            </div>
                            <div className="profile-stat">
                                <span className="profile-stat-value">{profile.followers || 0}</span>
                                <span className="profile-stat-label">Followers</span>
                            </div>
                            <div className="profile-stat">
                                <span className="profile-stat-value">{profile.followedUsers?.length || 0}</span>
                                <span className="profile-stat-label">Following</span>
                            </div>
                        </div>
                    </div>
                </header>

                <nav className="profile-tabs">
                    {PROFILE_TABS.map((name) => (
                        <button
                            key={name}
                            className={`profile-tab ${tab === name ? "active" : ""}`}
                            onClick={() => setTab(name)}
                        >
                            {TAB_LABELS[name]}
                        </button>
                    ))}
                </nav>

                <div className="profile-content">
                    <div className="profile-main">
                        {tab === "overview" && (
                            <div className="profile-main-sections">
                                <section className="profile-section">
                                    <div className="profile-section-header">
                                        <h2>Repositories</h2>
                                        <span className="profile-section-count">{profile.repositories?.length || 0}</span>
                                    </div>
                                    <div className="profile-repo-list">
                                        {(profile.repositories || []).slice(0, 6).map(repo => <RepoItem key={repo._id} repo={repo} />)}
                                        {profile.repositories?.length > 6 && (
                                            <button className="profile-view-all" onClick={() => setTab("repositories")}>View all</button>
                                        )}
                                    </div>
                                </section>
                                <section className="profile-section">
                                    <div className="profile-section-header">
                                        <h2>Stars</h2>
                                        <span className="profile-section-count">{profile.starRepo?.length || 0}</span>
                                    </div>
                                    <div className="profile-repo-list">
                                        {(profile.starRepo || []).slice(0, 6).map(repo => <RepoItem key={repo._id} repo={repo} />)}
                                        {profile.starRepo?.length > 6 && (
                                            <button className="profile-view-all" onClick={() => setTab("stars")}>View all</button>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}
                        {tab === "repositories" && (
                            <div className="profile-repo-list">
                                {(profile.repositories || []).map(repo => <RepoItem key={repo._id} repo={repo} />)}
                            </div>
                        )}
                        {tab === "stars" && (
                            <div className="profile-repo-list">
                                {(profile.starRepo || []).map(repo => <RepoItem key={repo._id} repo={repo} />)}
                            </div>
                        )}
                        {tab === "activity" && (
                            <div className="profile-activity-list">
                                {activities.length === 0 ? (
                                    <div className="shared-empty-state"><p>No public activity.</p></div>
                                ) : (
                                    activities.map(act => <ActivityItem key={act._id} activity={act} />)
                                )}
                            </div>
                        )}
                    </div>

                    <aside className="profile-sidebar">
                        <div className="profile-sidebar-panel">
                            <div className="profile-sidebar-panel-header">About</div>
                            <div className="profile-sidebar-panel-body">
                                {profile.bio || "No bio available."}
                            </div>
                        </div>
                        <div className="profile-sidebar-panel">
                            <div className="profile-sidebar-panel-header">Recent Activity</div>
                            <div className="profile-sidebar-panel-body">
                                {activities.slice(0, 5).map(act => <ActivityItem key={act._id} activity={act} />)}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProfilePage;
