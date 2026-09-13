import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "../../styles/layout.css";

const DashboardLayout = ({
    children,
    sidebar = true,
    topbarSearch = true
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(
        () =>
            typeof window !== "undefined" &&
            window.innerWidth > 768
    );
    const [isMobile, setIsMobile] = useState(
        () =>
            typeof window !== "undefined" &&
            window.innerWidth <= 768
    );

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && isMobile) {
                setIsSidebarOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isMobile]);

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    const closeDrawer = () => {
        if (isMobile) setIsSidebarOpen(false);
    };

    const layoutClass = sidebar
        ? isSidebarOpen
            ? "sidebar-open"
            : "sidebar-closed"
        : "layout--no-sidebar";

    return (
        <div className={`layout ${layoutClass}`}>
            {sidebar && (
                <Sidebar isOpen={isSidebarOpen} onNavigate={closeDrawer} />
            )}
            {sidebar && isMobile && isSidebarOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={closeDrawer}
                    aria-hidden="true"
                />
            )}
            <div className="layout-main">
                <Topbar
                    onToggleSidebar={toggleSidebar}
                    hideSearch={!topbarSearch}
                />
                <main className="layout-content">{children}</main>
            </div>
        </div>
    );
};

export default DashboardLayout;