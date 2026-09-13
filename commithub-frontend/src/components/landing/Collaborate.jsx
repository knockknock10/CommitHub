const items = [
    { avatar: "PS", color: "#58a6ff", actor: "Priya S.", action: "opened PR", resource: "#42 — feat/repo-search", type: "pr" },
    { avatar: "MJ", color: "#238636", actor: "Marcus J.", action: "merged", resource: "a1b2c3d", type: "merge" },
    { avatar: "ER", color: "#bc8cff", actor: "Elena R.", action: "closed issue", resource: "#142 — auth timeout on Safari", type: "issue" },
    { avatar: "DK", color: "#d29922", actor: "David K.", action: "reviewed", resource: "PR #38 — add rate limiting", type: "review" },
    { avatar: "TL", color: "#388bfd", actor: "Tina L.", action: "deployed", resource: "v2.3.0 to production", type: "deploy" }
];

const Collaborate = () => {
    return (
        <section className="ch-collaborate" id="collaborate">
            <div className="ch-section-inner">
                <div className="ch-section-header ch-section-header-centered">
                    <h2 className="ch-section-title">Ship together</h2>
                    <p className="ch-section-desc">
                        Review code, track issues, stay aligned. Every change visible
                        to the people who need to see it.
                    </p>
                </div>
                <div className="ch-collaborate-grid">
                    <div className="ch-collaborate-content">
                        <ul className="ch-collab-list">
                            <li className="ch-collab-list-item">
                                <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
                                    <path d="M4.5 8l2.5 2.5 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
                                </svg>
                                <span>Code reviews with inline comments and diff highlighting</span>
                            </li>
                            <li className="ch-collab-list-item">
                                <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
                                    <circle cx="5.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                                    <path d="M1.5 13c1.5 1 3 1.7 4.5 2M5.5 9h6M5.5 11.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>Issue tracking with labels, milestones, and assignees</span>
                            </li>
                            <li className="ch-collab-list-item">
                                <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
                                    <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                                    <rect x="8" y="2.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                                    <rect x="2.5" y="8" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                                    <rect x="8" y="8" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                                </svg>
                                <span>Team permissions that scale from 2 people to 200</span>
                            </li>
                            <li className="ch-collab-list-item">
                                <svg viewBox="0 0 16 16" fill="none" width="13" height="13" aria-hidden="true">
                                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
                                    <path d="M8 4.5v4.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span>Real-time activity across every repo in your organization</span>
                            </li>
                        </ul>
                        <div className="ch-collab-cta">
                            <a href="/signup" className="ch-hero-cta ch-hero-cta-primary">
                                Create your team
                                <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </a>
                            <a href="/login" className="ch-hero-cta ch-hero-cta-ghost">
                                Already here?
                            </a>
                        </div>
                    </div>

                    <div className="ch-activity-feed">
                        {items.map((item, i) => (
                            <div key={i} className="ch-activity-item">
                                <div className="ch-activity-avatar" style={{background: item.color}}>
                                    {item.avatar}
                                </div>
                                <div className="ch-activity-body">
                                    <div className="ch-activity-line">
                                        <span className="ch-activity-actor">{item.actor}</span>
                                        <span className="ch-activity-action">{item.action}</span>
                                        <span className={`ch-activity-resource ch-activity-resource-${item.type}`}>
                                            {item.resource}
                                        </span>
                                    </div>
                                    <span className="ch-activity-time">
                                        {i === 0 ? "2m ago" : i === 1 ? "14m ago" : i === 2 ? "1h ago" : i === 3 ? "3h ago" : "5h ago"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Collaborate;
