const Community = () => {
    return (
        <section className="landing-community">
            <div className="community-container">
                <div className="community-text">
                    <h2 className="community-title">The heartbeat of open source</h2>
                    <p className="community-description">
                        Join millions of developers who are building the next generation 
                        of software. Share your code, learn from others, and contribute 
                        to the projects that power the world.
                    </p>
                    <div className="community-stats">
                        <div className="comm-stat">
                            <span className="comm-stat-val">12M+</span>
                            <span className="comm-stat-lbl">Developers</span>
                        </div>
                        <div className="comm-stat">
                            <span className="comm-stat-val">500K+</span>
                            <span className="comm-stat-lbl">Open Source Projects</span>
                        </div>
                    </div>
                </div>
                <div className="community-visual">
                    <div className="contribution-graph-mock">
                        {Array.from({ length: 52 * 7 }).map((_, i) => (
                            <div key={i} className={`graph-square square-${(i * 7 + 3) % 4}`} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Community;
