import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <footer className="ch-footer">
            <div className="ch-footer-inner">
                <div className="ch-footer-top">
                    <div className="ch-footer-brand">
                        <Link to="/" className="ch-footer-mark">
                            <svg viewBox="0 0 32 32" fill="none" width="16" height="16" aria-hidden="true">
                                <path d="M16 2L2 9l14 7 14-7-14-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 23l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 16l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            CommitHub
                        </Link>
                        <p className="ch-footer-tagline">
                            Your repos, issues, and pull requests — in one dashboard.
                        </p>
                    </div>
                    <nav className="ch-footer-nav">
                        <div className="ch-footer-col">
                            <h4 className="ch-footer-col-title">Product</h4>
                            <ul className="ch-footer-links">
                                <li><Link to="/login">Repositories</Link></li>
                                <li><Link to="/login">Issues & PRs</Link></li>
                                <li><Link to="/login">Activity</Link></li>
                                <li><Link to="/login">Discussions</Link></li>
                            </ul>
                        </div>
                        <div className="ch-footer-col">
                            <h4 className="ch-footer-col-title">Account</h4>
                            <ul className="ch-footer-links">
                                <li><Link to="/login">Sign in</Link></li>
                                <li><Link to="/signup">Create account</Link></li>
                                <li><Link to="/login">Settings</Link></li>
                            </ul>
                        </div>
                        <div className="ch-footer-col">
                            <h4 className="ch-footer-col-title">Resources</h4>
                            <ul className="ch-footer-links">
                                <li><Link to="/login">CLI Reference</Link></li>
                                <li><Link to="/login">API Reference</Link></li>
                                <li><Link to="/login">Documentation</Link></li>
                            </ul>
                        </div>
                    </nav>
                </div>
                <div className="ch-footer-bottom">
                    <p>© 2026 CommitHub.</p>
                    <div className="ch-footer-social">
                        <a href="https://github.com/knockknock10" className="ch-footer-social-link" aria-label="GitHub">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.235-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.12-.345-.54-1.41-1.185-1.41-.63.0-1.08.54-1.08 1.08 0 .63.54 1.08 1.08 1.08.42 0 .765-.17.975-.48-3.015-.48-6.235-1.41-6.235-6.12 0-1.08.345-2.01 1.005-2.625-.105-.24-.42-.905-.42-2.01 0-1.56.765-2.625 1.965-2.625 1.02 0 1.59.63 1.59 1.59.63 1.295 1.92 1.59 1.92 1.59.225 0 .45-.052.63-.18.105-.105.225-.255.225-.45 0-.225.105-.405.105-.63 0 0 .54-.18 1.215-.18 1.215 0 1.755.54 1.755 1.26 0 1.185-.345 2.01-.84 2.625-.225.24-.42.48-.42.87 0 .63.54 1.08 1.185 1.08.63 0 1.08-.54 1.08-1.08 0-.63-.54-1.08-1.08-1.08z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
