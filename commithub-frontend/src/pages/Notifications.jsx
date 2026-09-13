import { useState, useEffect } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import StateBlock from "../components/ui/StateBlock";
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} from "../api/notificationApi";
import { useRealtimeEvent } from "../hooks/useRealtimeEvent";
import {
    BellIcon,
    CheckIcon,
    CloseIcon,
    MessageIcon,
    IssueIcon,
    PullRequestIcon,
    StarIcon,
    ForkIcon,
    GitMergeIcon,
    TagIcon,
    AlertIcon,
    EyeIcon,
    RefreshIcon,
} from "../components/ui/icons";

import "../styles/notifications.css";

const TYPE_STYLE = {
    ISSUE_CREATED: { icon: IssueIcon, tone: "issue" },
    ISSUE_COMMENTED: { icon: MessageIcon, tone: "issue" },
    PR_CREATED: { icon: PullRequestIcon, tone: "pr" },
    PR_COMMENTED: { icon: MessageIcon, tone: "pr" },
    PR_REVIEWED: { icon: EyeIcon, tone: "pr" },
    PR_APPROVED: { icon: CheckIcon, tone: "pr" },
    PR_CHANGES_REQUESTED: { icon: AlertIcon, tone: "issue" },
    PR_REVIEW_REQUIREMENTS_MET: { icon: CheckIcon, tone: "pr" },
    PR_MERGED: { icon: GitMergeIcon, tone: "pr" },
    PR_CLOSED: { icon: CloseIcon, tone: "repo" },
    PR_REOPENED: { icon: RefreshIcon, tone: "pr" },
    MENTION: { icon: MessageIcon, tone: "star" },
    REPOSITORY_STARRED: { icon: StarIcon, tone: "star" },
    RELEASE_PUBLISHED: { icon: TagIcon, tone: "pr" },
    REPOSITORY_FORKED: { icon: ForkIcon, tone: "repo" },
};

const getTypeStyle = (type) =>
    TYPE_STYLE[type] || { icon: BellIcon, tone: "repo" };

const formatRelativeTime = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
};

const TIME_BUCKETS = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 86400000) return "Today";
    if (diff < 604800000) return "This week";
    if (diff < 2592000000) return "This month";
    return "Earlier";
};

function groupByDay(notifications) {
    const map = {};
    const order = [];
    for (const n of notifications) {
        const bucket = TIME_BUCKETS(n.createdAt);
        if (!map[bucket]) {
            map[bucket] = [];
            order.push(bucket);
        }
        map[bucket].push(n);
    }
    return order.map((key) => ({ bucket: key, items: map[key] }));
}

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [actionError, setActionError] = useState("");

    const loadNotifications = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchNotifications({ limit: 50 });
            setNotifications(data.notifications || []);
        } catch {
            setError("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    useRealtimeEvent("NOTIFICATION_CREATED", () => {
        loadNotifications();
    });

    const handleMarkRead = async (id) => {
        setBusyId(id);
        setActionError("");
        try {
            await markNotificationRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, read: true } : n))
            );
        } catch {
            setActionError("Failed to mark notification as read");
        } finally {
            setBusyId(null);
        }
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        setActionError("");
        try {
            await markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {
            setActionError("Failed to mark all notifications as read");
        } finally {
            setMarkingAll(false);
        }
    };

    const handleDelete = async (id) => {
        setBusyId(id);
        setActionError("");
        try {
            await deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n._id !== id));
        } catch {
            setActionError("Failed to delete notification");
        } finally {
            setBusyId(null);
        }
    };

    const unreadCount = notifications.filter((n) => !n.read).length;
    const groups = groupByDay(notifications);

    return (
        <DashboardLayout>
            <div className="notifications-page">
                <div className="notifications-header">
                    <div>
                        <h1>Notifications</h1>
                        <p className="dashboard-header-sub">
                            View and manage everything that needs your
                            attention.
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="btn outline small"
                            onClick={handleMarkAllRead}
                            disabled={markingAll}
                        >
                            {markingAll ? (
                                <RefreshIcon
                                    size={14}
                                    className="spin"
                                />
                            ) : (
                                <CheckIcon size={14} />
                            )}
                            Mark all read ({unreadCount})
                        </button>
                    )}
                </div>

                {actionError && (
                    <div
                        className="shared-error notifications-action-error"
                        style={{ marginBottom: "var(--space-lg)" }}
                    >
                        <p>{actionError}</p>
                    </div>
                )}

                {loading && (
                    <StateBlock
                        variant="loading"
                        message="Loading notifications..."
                    />
                )}

                {error && (
                    <StateBlock
                        variant="error"
                        message={error}
                        retry={loadNotifications}
                    />
                )}

                {!loading && !error && notifications.length === 0 && (
                    <div className="notifications-empty">
                        <BellIcon
                            size={22}
                            style={{ color: "var(--text-faint)" }}
                        />
                        <p>You're all caught up.</p>
                        <span>New activity will land here.</span>
                    </div>
                )}

                {!loading && !error && notifications.length > 0 && (
                    groups.map((group) => (
                        <div className="notification-group" key={group.bucket}>
                            <div className="notification-group-label">
                                {group.bucket}
                            </div>
                            <div className="notification-list-page">
                                {group.items.map((n) => {
                                    const {
                                        icon: TypeIcon,
                                        tone
                                    } = getTypeStyle(n.type);
                                    const busy = busyId === n._id;
                                    return (
                                        <div
                                            key={n._id}
                                            className={`notification-page-item ${
                                                n.read ? "" : "unread"
                                            }`}
                                        >
                                            <span
                                                className={`notification-page-icon ${tone}`}
                                            >
                                                <TypeIcon size={14} />
                                            </span>
                                            <div className="notification-page-body">
                                                <p className="notification-page-message">
                                                    {n.message}
                                                </p>
                                                <div className="notification-page-time">
                                                    {n.actor?.userName && (
                                                        <strong>
                                                            {n.actor.userName}
                                                        </strong>
                                                    )}{" "}
                                                    · {formatRelativeTime(n.createdAt)}
                                                </div>
                                            </div>
                                            <div
                                                className="notification-page-actions"
                                                style={{
                                                    display: "flex",
                                                    gap: "var(--space-sm)",
                                                    alignItems: "center"
                                                }}
                                            >
                                                {!n.read && (
                                                    <button
                                                        className="btn ghost small"
                                                        onClick={() =>
                                                            handleMarkRead(n._id)
                                                        }
                                                        disabled={
                                                            busy || markingAll
                                                        }
                                                        aria-label="Mark as read"
                                                        title="Mark as read"
                                                    >
                                                        {busy ? (
                                                            <RefreshIcon
                                                                size={13}
                                                                className="spin"
                                                            />
                                                        ) : (
                                                            <CheckIcon
                                                                size={13}
                                                            />
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    className="btn ghost small"
                                                    onClick={() =>
                                                        handleDelete(n._id)
                                                    }
                                                    disabled={
                                                        busy || markingAll
                                                    }
                                                    aria-label="Delete notification"
                                                    title="Delete notification"
                                                    style={{
                                                        color:
                                                            "var(--danger)"
                                                    }}
                                                >
                                                    {busy ? (
                                                        <RefreshIcon
                                                            size={13}
                                                            className="spin"
                                                        />
                                                    ) : (
                                                        <CloseIcon
                                                            size={13}
                                                        />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
};

export default Notifications;