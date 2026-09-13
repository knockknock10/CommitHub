import { UsersIcon, GlobeIcon } from "../ui/icons";

const OpenSource = () => {
    return (
        <section className="gh-opensource">
            <div className="gh-opensource-container">
                <div className="gh-opensource-content">
                    <div className="gh-os-text">
                        <h2 className="gh-os-title">The home for open source</h2>
                        <p className="gh-os-subtitle">
                            Join millions of developers who are building the next generation 
                            of software. Share your code, learn from others, and contribute 
                            to the projects that power the world.
                        </p>
                        <div className="gh-os-cta">
                            <a href="/signup" className="gh-os-btn">Explore open source</a>
                        </div>
                    </div>
                    <div className="gh-os-visual">
                        <div className="gh-os-grid">
                            <div className="gh-os-card card-1">
                                <div className="gh-os-card-icon"><GlobeIcon size={20} /></div>
                                <div className="gh-os-card-info">
                                    <span className="gh-os-card-title">Global Reach</span>
                                    <span className="gh-os-card-desc">Contribute to projects worldwide.</span>
                                </div>
                            </div>
                            <div className="gh-os-card card-2">
                                <div className="gh-os-card-icon"><UsersIcon size={20} /></div>
                                <div className="gh-os-card-info">
                                    <span className="gh-os-card-title">Collaborative</span>
                                    <span className="gh-os-card-desc">Work with thousands of developers.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default OpenSource;
