import DashboardLayout from "../components/dashboard/DashboardLayout";

import "../styles/activity.css";

const activityData = [

    {
        type: "commit",
        title: "pushed changes to commithub-frontend",
        description: "updated repository details layout and improved dashboard responsiveness.",
        repo: "commithub-frontend",
        user: "sanjeev",
        time: "12 minutes ago"
    },

    {
        type: "merge",
        title: "merged feature/issues-page into main",
        description: "completed issue management interface and filtering system.",
        repo: "commithub-frontend",
        user: "sanjeev",
        time: "34 minutes ago"
    },

    {
        type: "branch",
        title: "created branch feature/pull-request-ui",
        description: "started pull request management workflow implementation.",
        repo: "commithub-backend",
        user: "sanjeev",
        time: "1 hour ago"
    },

    {
        type: "issue",
        title: "closed issue #42",
        description: "resolved protected route authentication redirect issue.",
        repo: "commithub-frontend",
        user: "sanjeev",
        time: "2 hours ago"
    },

    {
        type: "deploy",
        title: "deployed latest frontend build",
        description: "dashboard, repositories, and issue pages deployed successfully.",
        repo: "deployment-service",
        user: "sanjeev",
        time: "5 hours ago"
    },

    {
        type: "commit",
        title: "updated aws s3 upload service",
        description: "improved cloud storage response handling and validation.",
        repo: "aws-storage-service",
        user: "sanjeev",
        time: "yesterday"
    }
];

const Activity = () => {

    return (

        <DashboardLayout>

            <div className="activity-page">

                <div className="activity-page-header">

                    <div>

                        <h1>
                            Activity
                        </h1>

                        <p>
                            Track commits, merges, deployments, branches, and repository events.
                        </p>

                    </div>

                </div>

                <div className="activity-timeline">

                    {activityData.map((activity, index) => (

                        <div
                            className="timeline-item"
                            key={index}
                        >

                            <div className={`timeline-dot ${activity.type}`}></div>

                            <div className="timeline-content">

                                <div className="timeline-top">

                                    <h2>
                                        {activity.title}
                                    </h2>

                                    <span>
                                        {activity.time}
                                    </span>

                                </div>

                                <p>
                                    {activity.description}
                                </p>

                                <div className="timeline-meta">

                                    <span>
                                        {activity.repo}
                                    </span>

                                    <span>
                                        by {activity.user}
                                    </span>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            </div>

        </DashboardLayout>
    );
};

export default Activity;