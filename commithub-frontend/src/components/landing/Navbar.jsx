import { Link } from "react-router-dom";

const Navbar = () => {
    return (
        <header className="gh-nav">
            <div className="gh-nav-container">
                <div className="gh-nav-left">
                    <Link to="/" className="gh-nav-brand">
                        <span className="gh-nav-logo">◉</span>
                        <span className="gh-nav-text">CommitHub</span>
                    </Link>
                    <nav className="gh-nav-links">
                        <a href="#product" className="gh-nav-link">Product</a>
                        <a href="#explore" className="gh-nav-link">Explore</a>
                        <a href="#organizations" className="gh-nav-link">Organizations</a>
                        <a href="#open-source" className="gh-nav-link">Open Source</a>
                    </nav>
                </div>
                <div className="gh-nav-right">
                    <Link to="/login" className="gh-nav-signin">Sign in</Link>
                    <Link to="/signup" className="gh-nav-signup">Sign up</Link>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
