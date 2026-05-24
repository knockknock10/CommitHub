import "../../styles/cta.css";

const activities = [

    {
        type: "commit",
        text: "pushed authentication middleware update",
        time: "2 minutes ago"
    },

    {
        type: "merge",
        text: "merged feature/repository-dashboard into main",
        time: "14 minutes ago"
    },

    {
        type: "issue",
        text: "resolved issue #42 in commit workflow",
        time: "32 minutes ago"
    },

    {
        type: "deploy",
        text: "deployed latest frontend build to production",
        time: "1 hour ago"
    },

    {
        type: "branch",
        text: "created branch feature/activity-feed",
        time: "2 hours ago"
    }
];

const CTA = () => {

    return (

        <section className="activity-section">

            <div className="activity-header">

                <p className="activity-tag">
                    development activity
                </p>

                <h2 className="activity-title">

                    Track every update,
                    commit, and collaboration
                    in real time.

                </h2>

            </div>

            <div className="activity-container">

                {activities.map((activity, index) => (

                    <div
                        className="activity-card"
                        key={index}
                    >

                        <div
                            className={`activity-indicator ${activity.type}`}
                        ></div>

                        <div className="activity-content">

                            <p>
                                {activity.text}
                            </p>

                            <span>
                                {activity.time}
                            </span>

                        </div>

                    </div>

                ))}

            </div>

        </section>
    );
};

export default CTA;