const ComparisonTable = () => {
    const features = [
        { name: "Unlimited Public Repositories", free: "✓", pro: "✓", ent: "✓" },
        { name: "Private Repositories", free: "✓", pro: "✓", ent: "✓" },
        { name: "Collaborators", free: "Unlimited", pro: "Unlimited", ent: "Unlimited" },
        { name: "CI/CD Minutes", free: "2,000/mo", pro: "10,000/mo", ent: "Unlimited" },
        { name: "Storage", free: "500MB", pro: "10GB", ent: "Custom" },
        { name: "Advanced Security", free: "Basic", pro: "Advanced", ent: "Enterprise" },
        { name: "SSO & SAML", free: "—", pro: "—", ent: "✓" },
        { name: "Audit Logs", free: "—", pro: "Basic", ent: "Advanced" },
        { name: "Dedicated Support", free: "Community", pro: "Email", ent: "24/7 Priority" },
    ];

    return (
        <section className="landing-comparison">
            <div className="comparison-header">
                <h2>Compare all features</h2>
                <p>Get the right plan for your project's needs.</p>
            </div>

            <div className="comparison-table-container">
                <table className="comparison-table">
                    <thead>
                        <tr>
                            <th>Feature</th>
                            <th>Free</th>
                            <th>Pro</th>
                            <th>Enterprise</th>
                        </tr>
                    </thead>
                    <tbody>
                        {features.map((f, index) => (
                            <tr key={index}>
                                <td className="feature-name">{f.name}</td>
                                <td>{f.free}</td>
                                <td>{f.pro}</td>
                                <td>{f.ent}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default ComparisonTable;
