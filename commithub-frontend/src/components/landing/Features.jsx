import { RepoIcon, IssueIcon, PullRequestIcon, UsersIcon, SearchIcon, ActivityIcon } from "../ui/icons";

const Features = () => {
    const features = [
        {
            title: "Repositories",
            description: "Create and manage public and private repositories.",
            icon: RepoIcon,
        },
        {
            title: "Issues",
            description: "Track bugs, tasks, and discussions.",
            icon: IssueIcon,
        },
        {
            title: "Pull Requests",
            description: "Review and collaborate on code changes.",
            icon: PullRequestIcon,
        },
        {
            title: "Organizations",
            description: "Work with teams and shared repositories.",
            icon: UsersIcon,
        },
        {
            title: "Search",
            description: "Discover developers, repositories, and organizations.",
            icon: SearchIcon,
        },
        {
            title: "Activity",
            description: "Follow what is happening across CommitHub.",
            icon: ActivityIcon,
        }
    ];

    return (
        <section className="gh-features" id="product">
            <div className="gh-features-container">
                <div className="gh-features-header">
                    <h2 className="gh-features-title">CommitHub capabilities</h2>
                    <p className="gh-features-subtitle">Everything you need to build, ship, and maintain software.</p>
                </div>
                <div className="gh-features-grid">
                    {features.map((f, i) => {
                        const Icon = f.icon;
                        return (
                            <div className="gh-feature-card" key={i}>
                                <div className="gh-feature-icon">
                                    <Icon size={24} />
                                </div>
                                <h3 className="gh-feature-title">{f.title}</h3>
                                <p className="gh-feature-desc">{f.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Features;
