import { NavLink } from "react-router-dom";

import "../../styles/sidebar.css";

const Sidebar = () => {

    return (

        <aside className="sidebar">

            <div className="sidebar-logo">

                CommitHub

            </div>

            <nav className="sidebar-nav">

                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        isActive ? "active-sidebar-link" : ""
                    }
                >
                    overview
                </NavLink>

                <NavLink
                    to="/repositories"
                    className={({ isActive }) =>
                        isActive ? "active-sidebar-link" : ""
                    }
                >
                    repositories
                </NavLink>

                <NavLink
                    to="/issues"
                    className={({ isActive }) =>
                        isActive ? "active-sidebar-link" : ""
                    }
                >
                    issues
                </NavLink>

                <NavLink
                    to="/pull-requests"
                    className={({ isActive }) =>
                        isActive ? "active-sidebar-link" : ""
                    }
                >
                    pull requests
                </NavLink>

                <NavLink
                    to="/activity"
                    className={({ isActive }) =>
                        isActive ? "active-sidebar-link" : ""
                    }
                >
                    activity
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        isActive ? "active-sidebar-link" : ""
                    }
                >
                    settings
                </NavLink>

            </nav>

        </aside>
    );
};

export default Sidebar;