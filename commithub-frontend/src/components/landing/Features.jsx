const features = [
    {
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                <path d="M3 4l-1 2h7l-1-2-1.5 1zM3 8l-1 2h7l-1-2-1.5 1zM3 12l-1 2h7l-1-2-1.5 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 3l2 5-2 4M15 12V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
        title: "Repositories",
        desc: "Host public and private repos. Import from GitHub, GitLab, or Bitbucket."
    },
    {
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M7 7h6M7 10.5h4M7 14h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="15" cy="15" r="1.2" fill="currentColor"/>
            </svg>
        ),
        title: "Issues & PRs",
        desc: "Track bugs and features. Review code with diffs and inline comments."
    },
    {
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                <path d="M3.5 13.5a8 8 0 017-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 6v9M12 13.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M5 10.5l1.5-2 2.5 1.5M11 6l1.5 1.5 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
        title: "CI/CD",
        desc: "Define pipelines as YAML. Tests, builds, and deploys on every push."
    },
    {
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M12 12.5a4 4 0 01-2.5-1.2M12 9a4 4 0 001-2.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M4 12l3 3M7 15h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        ),
        title: "Team access",
        desc: "Roles, teams, and org-level permissions. Scale from 2 to 200 people."
    },
    {
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M7 7h6M7 10h3.5M7 4h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
        ),
        title: "Activity feed",
        desc: "See who changed what, when, and where. One stream across all repos."
    },
    {
        icon: (
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M10 6.5v4.5M10 12.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M7 14h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
        ),
        title: "Discussions",
        desc: "Conversations outside of issues. Share ideas and resolve questions."
    }
];

const Features = () => {
    return (
        <section className="ch-features" id="features">
            <div className="ch-section-inner">
                <div className="ch-section-header ch-section-header-centered">
                    <h2 className="ch-section-title">What you get</h2>
                    <p className="ch-section-desc">
                        Everything you need to host, collaborate on, and ship code.
                    </p>
                </div>
                <div className="ch-features-grid">
                    {features.map(f => (
                        <div key={f.title} className="ch-feature-card">
                            <div className="ch-feature-icon">{f.icon}</div>
                            <h3 className="ch-feature-title">{f.title}</h3>
                            <p className="ch-feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
