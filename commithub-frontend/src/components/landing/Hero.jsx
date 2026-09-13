import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Hero = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleStartBuilding = () => {
        if (user) {
            navigate("/dashboard");
        } else {
            navigate("/signup");
        }
    };

    return (
        <section className="gh-hero" id="hero">
            <div className="gh-hero-inner">
                <div className="gh-hero-content">
                    <h1 className="gh-hero-title">
                        Build. Collaborate. Ship.
                    </h1>

                    <p className="gh-hero-subtitle">
                        Your code, repositories, issues, and pull requests — in one place.
                    </p>

                    <div className="gh-hero-cta">
                        <button
                            type="button"
                            className="gh-hero-btn primary"
                            onClick={handleStartBuilding}
                        >
                            Start building
                        </button>
                        <a
                            href="#explore"
                            className="gh-hero-btn secondary"
                        >
                            Explore repositories
                        </a>
                    </div>
                </div>

                <div className="gh-hero-visual">
                    <div className="gh-cli-terminal" role="presentation">
                        <div className="cli-header">
                            <div className="cli-window-controls" aria-hidden="true">
                                <span className="cli-dot dot-red"></span>
                                <span className="cli-dot dot-yellow"></span>
                                <span className="cli-dot dot-green"></span>
                            </div>
                            <span className="cli-title">CommitHub CLI</span>
                            <span className="cli-spacer"></span>
                        </div>
                        <div className="cli-body">
                            <div className="cli-line cli-command">
                                <span className="cli-prompt">$ ch status</span>
                            </div>
                            <div className="cli-line">
                                <span className="cli-host">On branch main</span>
                            </div>
                            <div className="cli-line">
                                <span className="cli-changes">Changes to be committed:</span>
                            </div>
                            <div className="cli-line cli-indent">
                                <span className="cli-modified">modified: src/auth.js</span>
                            </div>
                            <div className="cli-line cli-indent">
                                <span className="cli-modified">modified: src/pages/Home.jsx</span>
                            </div>
                            <div className="cli-line cli-command">
                                <span className="cli-prompt">$ ch commit -m &quot;Improve repository experience&quot;</span>
                            </div>
                            <div className="cli-line">
                                <span className="cli-git-output">
                                    [main 8f31c2a] Improve repository experience
                                </span>
                            </div>
                            <div className="cli-line cli-command">
                                <span className="cli-prompt">$ ch push</span>
                            </div>
                            <div className="cli-line">
                                <span className="cli-git-output">
                                    Pushed to origin/main
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="cli-identity">
                        <span className="cli-identity-logo">◉</span>
                        CommitHub CLI — A Git-like workflow for CommitHub.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Hero;