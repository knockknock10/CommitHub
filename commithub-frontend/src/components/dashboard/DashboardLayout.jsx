import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "../../styles/layout.css";

const DashboardLayout = ({ children }) => {
    return (
        <div className="layout">
            <Sidebar />
            <div className="layout-main">
                <Topbar />
                <main className="layout-content">{children}</main>
            </div>
        </div>
    );
};

export default DashboardLayout;