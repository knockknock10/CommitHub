const Workflow = () => {
    const workflowSteps = [
        {
            number: "01",
            title: "Initialize",
            description:
                "Create repositories and structure projects in seconds."
        },
        {
            number: "02",
            title: "Track changes",
            description:
                "Manage commits, branches, and history with full visibility."
        },
        {
            number: "03",
            title: "Collaborate",
            description:
                "Review, discuss, and resolve issues and pull requests together."
        },
        {
            number: "04",
            title: "Ship",
            description:
                "Release, tag, and deploy with a clear audit trail."
        }
    ];

    return (
        <section className="landing-workflow" id="workflow">
            <div className="landing-workflow-inner">
                <div className="landing-workflow-header">
                    <h2>Built around how developers work</h2>
                    <p>From first commit to production, nothing gets lost.</p>
                </div>

                <div className="landing-workflow-steps">
                    {workflowSteps.map((step, index) => (
                        <div className="landing-workflow-step" key={index}>
                            <span className="landing-workflow-step-num">
                                {step.number}
                            </span>
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Workflow;