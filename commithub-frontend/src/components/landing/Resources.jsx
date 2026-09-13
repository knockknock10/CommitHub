const Resources = () => {
    const articles = [
        { title: "The Future of AI in Version Control", category: "Blog", date: "Sep 11, 2026", readTime: "5 min" },
        { title: "Scaling your team from 10 to 100", category: "Guide", date: "Sep 05, 2026", readTime: "12 min" },
        { title: "Optimizing your CI/CD pipelines", category: "Technical", date: "Aug 28, 2026", readTime: "8 min" },
    ];

    return (
        <section className="landing-resources" id="resources">
            <div className="resources-container">
                <div className="resources-header">
                    <h2 className="resources-title">Knowledge hub</h2>
                    <p className="resources-subtitle">Deep dives, tutorials, and industry insights to help you grow.</p>
                </div>
                <div className="resources-grid">
                    {articles.map((art, index) => (
                        <div className="resource-card" key={index}>
                            <div className="resource-category">{art.category}</div>
                            <h3 className="resource-title">{art.title}</h3>
                            <div className="resource-meta">
                                <span>{art.date}</span>
                                <span className="meta-sep">•</span>
                                <span>{art.readTime} read</span>
                            </div>
                        </div>
                    ))}
                    <div className="resource-card view-all">
                        <div className="view-all-content">
                            <span className="view-all-title">More resources</span>
                            <span className="view-all-arrow">→</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Resources;
