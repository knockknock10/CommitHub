const Integrations = () => {
    const tools = [
        { name: "VS Code", category: "Editor", color: "#007acc" },
        { name: "Slack", category: "Communication", color: "#4a154b" },
        { name: "Jira", category: "Planning", color: "#0052cc" },
        { name: "Figma", category: "Design", color: "#f24e1e" },
        { name: "Discord", category: "Community", color: "#5865f2" },
        { name: "AWS", category: "Cloud", color: "#ff9900" },
        { name: "Azure", category: "Cloud", color: "#0089d6" },
        { name: "Google Cloud", category: "Cloud", color: "#4285f4" },
    ];

    return (
        <section className="landing-integrations">
            <div className="integrations-header">
                <h2 className="integrations-title">Works with the tools you love</h2>
                <p className="integrations-subtitle">Connect CommitHub to your existing workflow with one-click integrations.</p>
            </div>

            <div className="integrations-grid">
                {tools.map((tool, index) => (
                    <div className="integration-card" key={index}>
                        <div className="integration-logo" style={{ borderColor: tool.color }}>
                            <span style={{ color: tool.color }}>{tool.name[0]}</span>
                        </div>
                        <div className="integration-info">
                            <span className="integration-name">{tool.name}</span>
                            <span className="integration-category">{tool.category}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Integrations;
