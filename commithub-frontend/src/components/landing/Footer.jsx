import { Link } from "react-router-dom";

const Footer = () => {
    const columns = [
        {
            title: "Product",
            links: [
                { label: "Repositories", to: "/repositories" },
                { label: "Issues", to: "/issues" },
                { label: "Pull Requests", to: "/pull-requests" },
                { label: "Organizations", to: "#organizations" },
            ],
        },
        {
            title: "Explore",
            links: [
                { label: "Activity", to: "/activity" },
                { label: "Search", to: "/search-results" },
                { label: "Discover", to: "#explore" },
            ],
        },
        {
            title: "Resources",
            links: [
                { label: "CLI workflow", to: "#workflow" },
                { label: "Capabilities", to: "#product" },
                { label: "Open Source", to: "#open-source" },
            ],
        },
    ];

    return (
        <footer className="gh-footer">
            <div className="gh-footer-container">
                <div className="gh-footer-grid">
                    <div className="gh-footer-col gh-footer-brand-col">
                        <Link to="/" className="gh-footer-brand">
                            <span className="gh-footer-logo">◉</span>
                            <span className="gh-footer-name">CommitHub</span>
                        </Link>
                        <p className="gh-footer-tagline">
                            The developer platform for building and shipping software together.
                        </p>
                    </div>

                    {columns.map((col) => (
                        <div className="gh-footer-col" key={col.title}>
                            <h4 className="gh-footer-col-title">{col.title}</h4>
                            <ul className="gh-footer-links">
                                {col.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            to={link.to}
                                            className="gh-footer-link"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="gh-footer-bottom">
                    <span>© 2026 CommitHub</span>
                    <span>Built for developers, on CommitHub.</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;