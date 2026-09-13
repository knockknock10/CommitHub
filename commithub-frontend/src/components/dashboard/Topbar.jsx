import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeEvent } from "../../hooks/useRealtimeEvent";
import { useSocket } from "../../context/SocketContext";
import useDebounce from "../../hooks/useDebounce";
import {
    fetchUnreadCount,
    fetchNotifications,
    markAllNotificationsRead
} from "../../api/notificationApi";
import { useEffect, useCallback, useRef, useState } from "react";
import {
    MenuIcon,
    SearchIcon,
    BellIcon,
    UserIcon,
    RepoIcon,
    SettingsIcon,
    LogoutIcon,
    ChevronRightIcon
} from "../ui/icons";
import "../../styles/topbar.css";

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

const Topbar = ({ onToggleSidebar, hideSearch = false }) => {
    const { user, logout } = useAuth();
    const { connected } = useSocket();
    const navigate = useNavigate();

    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [dropdownError, setDropdownError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 300);
    const searchInputRef = useRef(null);

    const initials = user?.userName
        ? user.userName.slice(0, 2).toUpperCase()
        : "??";

    const loadUnreadCount = useCallback(async () => {
        try {
            const data = await fetchUnreadCount();
            setUnreadCount(data.unread || 0);
        } catch {
            // best-effort
        }
    }, []);

    const loadNotifications = useCallback(async () => {
        try {
            const data = await fetchNotifications({ limit: 12 });
            setNotifications(data.notifications || []);
        } catch {
            // best-effort
        }
    }, []);

    useEffect(() => {
        loadUnreadCount();
    }, [loadUnreadCount]);

    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            if (e.key === "Escape") {
                setShowNotifications(false);
                setShowProfileMenu(false);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    useRealtimeEvent("NOTIFICATION_CREATED", () => {
        loadUnreadCount();
        if (showNotifications) loadNotifications();
    });

    const handleNotificationToggle = async () => {
        const next = !showNotifications;
        setShowNotifications(next);
        setShowProfileMenu(false);
        if (next) await loadNotifications();
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        setDropdownError("");
        try {
            await markAllNotificationsRead();
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {
            setDropdownError("Couldn't mark all as read");
        } finally {
            setMarkingAll(false);
        }
    };

    const navigateToSearchResults = (query) => {
        const trimmed = query.trim();
        if (trimmed.length < 2) return;
        navigate(`/search-results?q=${encodeURIComponent(trimmed)}`);
    };

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    useEffect(() => {
        // Search navigates on Enter / button click only (debounced value kept for a11y/focus UX).
    }, [debouncedSearch]);

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (
                showProfileMenu &&
                !event.target.closest(".profile-menu-wrap")
            ) {
                setShowProfileMenu(false);
            }
            if (
                showNotifications &&
                !event.target.closest(".notification-wrapper")
            ) {
                setShowNotifications(false);
            }
        };
        if (showProfileMenu || showNotifications) {
            document.addEventListener("click", closeOnOutsideClick);
        }
        return () => document.removeEventListener("click", closeOnOutsideClick);
    }, [showProfileMenu, showNotifications]);

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button
                    className="topbar-icon-btn"
                    onClick={onToggleSidebar}
                    aria-label="Toggle sidebar"
                >
                    <MenuIcon size={18} />
                </button>

                <Link to="/" className="topbar-brand" aria-label="CommitHub home">
                    <span className="topbar-brand-mark" aria-hidden="true">
                        AA
                    </span>
                    <span className="topbar-brand-name">CommitHub</span>
                </Link>

                <div className="search-wrapper">
                    {!hideSearch && (
                        <>
                            <SearchIcon
                                className="search-leading-icon"
                                size={15}
                            />
                            <input
                                ref={searchInputRef}
                                type="text"
                                role="searchbox"
                                aria-label="Search"
                                placeholder="Search repositories, users, organizations…"
                                value={searchTerm}
                                onChange={(e) =>
                                    setSearchTerm(e.target.value)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        navigateToSearchResults(searchTerm);
                                    }
                                }}
                            />
                            <kbd className="search-kbd" aria-hidden="true">
                                ⌘K
                            </kbd>
                            <button
                                type="button"
                                className="search-btn"
                                onClick={() =>
                                    navigateToSearchResults(searchTerm)
                                }
                            >
                                Search
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="topbar-right">
                <div
                    className="connection-status"
                    title={
                        connected
                            ? "Real-time Connected"
                            : "Real-time Disconnected"
                    }
                >
                    <span
                        className={`status-dot ${connected ? "connected" : "disconnected"
                            }`}
                    />
                </div>

                <div className="notification-wrapper">
                    <button
                        className="topbar-icon-btn notification-bell"
                        onClick={handleNotificationToggle}
                        aria-label="Notifications"
                        aria-expanded={showNotifications}
                    >
                        <BellIcon size={18} />
                        {unreadCount > 0 && (
                            <span className="notification-badge">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notification-dropdown-header">
                                <span className="notification-dropdown-title">
                                    Notifications
                                </span>
                                {unreadCount > 0 && (
                                    <button
                                        className="mark-read-btn"
                                        onClick={handleMarkAllRead}
                                        disabled={markingAll}
                                    >
                                        {markingAll
                                            ? "Marking…"
                                            : "Mark all read"}
                                    </button>
                                )}
                            </div>

                            {dropdownError && (
                                <div className="notification-dropdown-error">
                                    {dropdownError}
                                </div>
                            )}

                            <div className="notification-list">
                                {notifications.length === 0 && (
                                    <div className="notification-empty">
                                        <p>All caught up.</p>
                                        <span>
                                            New activity will land here.
                                        </span>
                                    </div>
                                )}

                                {notifications.map((n) => (
                                    <div
                                        key={n._id}
                                        className={`notification-item ${n.read ? "" : "unread"
                                            }`}
                                    >
                                        <span className="notification-item-dot" />
                                        <span className="notification-item-body">
                                            <span className="notification-item-msg">
                                                {n.message}
                                            </span>
                                            <span className="notification-item-time">
                                                {formatRelativeTime(
                                                    n.createdAt
                                                )}
                                            </span>
                                        </span>
                                    </div>
                                ))}

                                {notifications.length > 0 && (
                                    <button
                                        type="button"
                                        className="notification-view-all"
                                        onClick={() => {
                                            setShowNotifications(false);
                                            navigate("/notifications");
                                        }}
                                    >
                                        View all notifications
                                        <ChevronRightIcon size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="profile-menu-wrap">
                    <button
                        className="profile-btn"
                        onClick={() => {
                            setShowProfileMenu((prev) => !prev);
                            setShowNotifications(false);
                        }}
                        aria-label="Open profile menu"
                        aria-expanded={showProfileMenu}
                    >
                        {initials}
                    </button>

                    {showProfileMenu && (
                        <div className="profile-menu">
                            <div className="profile-menu-header">
                                <span className="profile-menu-name">
                                    {user?.name || user?.userName}
                                </span>
                                <span className="profile-menu-sub">
                                    @{user?.userName}
                                </span>
                            </div>
                            <Link
                                to={`/profile/${user?._id}`}
                                className="profile-menu-item"
                                onClick={() => setShowProfileMenu(false)}
                            >
                                <UserIcon size={15} />
                                Your profile
                            </Link>
                            <Link
                                to="/repositories"
                                className="profile-menu-item"
                                onClick={() => setShowProfileMenu(false)}
                            >
                                <RepoIcon size={15} />
                                Your repositories
                            </Link>
                            <Link
                                to="/settings"
                                className="profile-menu-item"
                                onClick={() => setShowProfileMenu(false)}
                            >
                                <SettingsIcon size={15} />
                                Settings
                            </Link>
                            <div className="profile-menu-divider" />
                            <button
                                type="button"
                                className="profile-menu-item profile-menu-logout"
                                onClick={handleLogout}
                            >
                                <LogoutIcon size={15} />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Topbar;