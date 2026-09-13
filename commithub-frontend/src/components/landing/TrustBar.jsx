const TrustBar = () => {
    const partners = ["Microsoft", "Amazon", "Google", "Netflix", "Meta", "Airbnb"];
    return (
        <section className="gh-trust-bar">
            <div className="gh-trust-container">
                <span className="gh-trust-label">TRUSTED BY THE WORLD'S MOST INNOVATIVE TEAMS</span>
                <div className="gh-trust-logos">
                    {partners.map((p, i) => (
                        <span key={i} className="gh-trust-logo">{p}</span>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TrustBar;
