import { Link } from "react-router-dom";

const Navbar = () => {
    return (
        <header className="ch-nav">
            <div className="ch-nav-inner">
                <Link to="/" className="ch-nav-brand">
                    <svg viewBox="0 0 32 32" fill="none" width="18" height="18" className="ch-nav-mark" aria-hidden="true">
                        <path d="M16 2L2 9l14 7 14-7-14-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 23l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 16l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    CommitHub
                </Link>
                <nav className="ch-nav-links" aria-label="Primary">
                    <a href="#features" className="ch-nav-link">What you get</a>
                    <a href="#workflow" className="ch-nav-link">How it works</a>
                    <a href="#repos" className="ch-nav-link">Repos</a>
                    <a href="#collaborate" className="ch-nav-link">Collaborate</a>
                </nav>
                <div className="ch-nav-right">
                    <a href="/login" className="ch-nav-signin">Sign in</a>
                    <a href="/signup" className="ch-nav-cta">
                        Get started
                        <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </a>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
