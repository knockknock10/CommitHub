import "../../styles/navbar.css";

const Navbar = () => {

    return (

        <header className="navbar">

            <div className="navbar-left">

                <h1 className="logo">
                    CommitHub
                </h1>

            </div>

            <nav className="navbar-center">

                <a href="/">
                    Features
                </a>

                <a href="/">
                    Repositories
                </a>

                <a href="/">
                    Collaboration
                </a>

                <a href="/">
                    Docs
                </a>

            </nav>

            <div className="navbar-right">

                <a
                    href="/login"
                    className="signin-btn"
                >
                    Sign in
                </a>

                <a
                    href="/signup"
                    className="signup-btn"
                >
                    Get Started
                </a>

            </div>

        </header>
    );
};

export default Navbar;