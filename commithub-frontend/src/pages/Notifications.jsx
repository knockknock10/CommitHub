import { useState, useEffect } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} from "../api/notificationApi";
import { useRealtimeEvent } from "../hooks/useRealtimeEvent";

import "../styles/notifications.css";

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadNotifications = async () => {
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
        try {
            await markNotificationRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, read: true } : n))
            );
        } catch {
            // best-effort
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {
            // best-effort
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n._id !== id));
        } catch {
            // best-effort
        }
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <DashboardLayout>
            <div className="notifications-page">
                <div className="notifications-header">
                    <div>
                        <h1>Notifications</h1>
                        <p>View and manage your notifications.</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="notifications-mark-all"
                            onClick={handleMarkAllRead}
                        >
                            Mark all as read ({unreadCount})
                        </button>
                    )}
                </div>

                {loading && (
                    <div className="shared-loading">
                        <p>Loading notifications...</p>
                    </div>
                )}

                {error && (
                    <div className="shared-error">
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && notifications.length === 0 && (
                    <div className="shared-empty-state">
                        <p>No notifications. You're all caught up!</p>
                    </div>
                )}

                {!loading && !error && notifications.length > 0 && (
                    <div className="notifications-list">
                        {notifications.map((n) => (
                            <div
                                key={n._id}
                                className={`notification-row ${n.read ? "" : "unread"}`}
                            >
                                <div className="notification-content">
                                    <p className="notification-message">{n.message}</p>
                                    <span className="notification-time">
                                        {new Date(n.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="notification-actions">
                                    {!n.read && (
                                        <button
                                            className="notification-action-btn"
                                            onClick={() => handleMarkRead(n._id)}
                                        >
                                            Mark read
                                        </button>
                                    )}
                                    <button
                                        className="notification-action-btn delete"
                                        onClick={() => handleDelete(n._id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Notifications;
