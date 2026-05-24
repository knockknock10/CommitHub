import "../../styles/stats.css";

const repositories = [

    {
        name: "commithub-frontend",

        visibility: "public",

        description:
        "frontend interface for repository workflows and collaboration.",

        branch: "main",

        commits: "142 commits",

        issues: "9 open issues",

        updated: "updated 2 hours ago"
    },

    {
        name: "commithub-backend",

        visibility: "private",

        description:
        "authentication, repository handling, branches and commit engine.",

        branch: "develop",

        commits: "87 commits",

        issues: "4 open issues",

        updated: "updated 30 minutes ago"
    },

    {
        name: "aws-storage-service",

        visibility: "private",

        description:
        "aws s3 integration for uploads and repository asset management.",

        branch: "storage-v2",

        commits: "39 commits",

        issues: "2 open issues",

        updated: "updated yesterday"
    }
];

const Stats = () => {

    return (

        <section className="repo-preview">

            <div className="repo-preview-header">

                <p className="repo-tag">
                    repository management
                </p>

                <h2 className="repo-title">

                    Built for structured
                    development workflows.

                </h2>

                <p className="repo-description">

                    Manage repositories, commits,
                    issues, branches, and collaboration
                    from one organized workspace.

                </p>

            </div>

            <div className="repo-list">

                {repositories.map((repo, index) => (

                    <div
                        className="repo-item"
                        key={index}
                    >

                        <div className="repo-top">

                            <div>

                                <div className="repo-name-row">

                                    <h3>
                                        {repo.name}
                                    </h3>

                                    <span
                                        className={
                                            repo.visibility
                                        }
                                    >
                                        {repo.visibility}
                                    </span>

                                </div>

                                <p className="repo-desc">

                                    {repo.description}

                                </p>

                            </div>

                        </div>

                        <div className="repo-bottom">

                            <span>
                                {repo.branch}
                            </span>

                            <span>
                                {repo.commits}
                            </span>

                            <span>
                                {repo.issues}
                            </span>

                            <span>
                                {repo.updated}
                            </span>

                        </div>

                    </div>

                ))}

            </div>

        </section>
    );
};

export default Stats;