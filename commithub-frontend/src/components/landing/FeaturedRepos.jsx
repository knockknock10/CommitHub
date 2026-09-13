import { RepoIcon, StarIcon, ForkIcon } from "../ui/icons";

const FeaturedRepos = () => {
    const repos = [
        { name: "commit-hub-core", desc: "The engine powering our platform.", stars: "12.4k", forks: "1.2k", lang: "TypeScript", color: "#3178c6" },
        { name: "gh-ui-kit", desc: "A high-fidelity component library for devs.", stars: "8.1k", forks: "400", lang: "React", color: "#61dafb" },
        { name: "dev-workflow-ai", desc: "AI-driven automation for CI/CD.", stars: "15.7k", forks: "2.1k", lang: "Python", color: "#3572A5" },
    ];

    return (
        <section className="gh-featured-repos">
            <div className="gh-featured-container">
                <div className="gh-featured-header">
                    <h2 className="gh-featured-title">Explore the ecosystem</h2>
                    <p className="gh-featured-subtitle">Discover the most innovative projects on CommitHub.</p>
                </div>
                <div className="gh-featured-grid">
                    {repos.map((repo, i) => (
                        <div className="gh-repo-card" key={i}>
                            <div className="gh-repo-card-header">
                                <div className="gh-repo-title-group">
                                    <RepoIcon size={16} />
                                    <span className="gh-repo-name">{repo.name}</span>
                                </div>
                                <span className="gh-repo-lang" style={{ borderColor: repo.color }}>{repo.lang}</span>
                            </div>
                            <p className="gh-repo-desc">{repo.desc}</p>
                            <div className="gh-repo-stats">
                                <span className="gh-repo-stat">
                                    <StarIcon size={14} /> {repo.stars}
                                </span>
                                <span className="gh-repo-stat">
                                    <ForkIcon size={14} /> {repo.forks}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturedRepos;
