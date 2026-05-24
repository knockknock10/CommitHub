import "../../styles/workflow.css";

const Workflow = () => {

    const workflowSteps = [

        {
            number: "01",
            title: "Initialize Repository",

            description:
            "Create repositories and structure projects with organized version control."
        },

        {
            number: "02",
            title: "Track Changes",

            description:
            "Manage commits, branches, merges, and development history efficiently."
        },

        {
            number: "03",
            title: "Collaborate With Teams",

            description:
            "Work together using shared repositories, issues, and development workflows."
        },

        {
            number: "04",
            title: "Push & Deploy",

            description:
            "Sync updates, manage remote repositories, and prepare projects for deployment."
        }
    ];

    return (

        <section className="workflow">

            <div className="workflow-header">

                <p className="workflow-tag">
                    development workflow
                </p>

                <h2 className="workflow-title">

                    Built around the way
                    developers already work.

                </h2>

            </div>

            <div className="workflow-grid">

                {workflowSteps.map((step, index) => (

                    <div
                        className="workflow-card"
                        key={index}
                    >

                        <span className="workflow-number">
                            {step.number}
                        </span>

                        <h3>
                            {step.title}
                        </h3>

                        <p>
                            {step.description}
                        </p>

                    </div>

                ))}

            </div>

        </section>
    );
};

export default Workflow;