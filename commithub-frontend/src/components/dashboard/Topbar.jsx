import { useNavigate }
from "react-router-dom";

import { useAuth }
from "../../context/AuthContext";

import "../../styles/topbar.css";

const Topbar = () => {

    const { logout } = useAuth();

    const navigate = useNavigate();

    const handleLogout = () => {

        logout();

        navigate("/");
    };

    return (

        <header className="topbar">

            <input
                type="text"
                placeholder="Search repositories..."
            />

            <div className="topbar-right">

                <button
                    onClick={handleLogout}
                >
                    Logout
                </button>

                <div className="profile">

                    SK

                </div>

            </div>

        </header>
    );
};

export default Topbar;