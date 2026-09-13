import { NavLink, useNavigate } from "react-router-dom";
import {
    HomeIcon,
    ActivityIcon,
    RepoIcon,
    IssueIcon,
    PullRequestIcon,
    BellIcon,
    SettingsIcon,
    PlusIcon
} from "../ui/icons";
import "../../styles/sidebar.css";

const NAV_SECTIONS = [
    {
        label: "Platform",
        items: [
            { to: "/", label: "Home", icon: HomeIcon, end: true },
            {
                to: "/repositories",
                label: "Repositories",
                icon: RepoIcon,
                end: false
            },
            {
                to: "/issues",
                label: "Issues",
                icon: IssueIcon,
                end: false
            },
            {
                to: "/pull-requests",
                label: "Pull Requests",
                icon: PullRequestIcon,
                end: false
            }
        ]
    },
    {
        label: "Manage",
        items: [
            {
                to: "/activity",
                label: "Activity",
                icon: ActivityIcon,
                end: false
            },
            {
                to: "/notifications",
                label: "Notifications",
                icon: BellIcon,
                end: false
            },
            {
                to: "/settings",
                label: "Settings",
                icon: SettingsIcon,
                end: false
            }
        ]
    }
];

const Sidebar = ({ isOpen, onNavigate }) => {
    const navigate = useNavigate();

    return (
        <aside
            className={`sidebar ${isOpen ? "open" : "closed"}`}
            aria-label="Primary"
        >
            <div
                className="sidebar-logo"
                onClick={() => navigate("/")}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        navigate("/");
                    }
                }}
                title="CommitHub"
            >
                <span className="sidebar-logo-mark" aria-hidden="true">
                    ◉
                </span>
                <span className="sidebar-logo-name">CommitHub</span>
            </div>

            <nav className="sidebar-nav">
                {NAV_SECTIONS.map((section) => (
                    <div className="sidebar-section" key={section.label}>
                        <span className="sidebar-section-label">
                            {section.label}
                        </span>
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    title={item.label}
                                    onClick={onNavigate}
                                    className={({ isActive }) =>
                                        isActive
                                            ? "active-sidebar-link"
                                            : ""
                                    }
                                >
                                    <Icon className="sidebar-nav-icon" size={16} />
                                    <span className="sidebar-nav-label">
                                        {item.label}
                                    </span>
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <button
                type="button"
                className="sidebar-new-btn"
                onClick={() => {
                    onNavigate?.();
                    navigate("/new");
                }}
                title="New repository"
            >
                <PlusIcon size={15} />
                <span className="sidebar-new-label">New repository</span>
            </button>
        </aside>
    );
};

export default Sidebar;