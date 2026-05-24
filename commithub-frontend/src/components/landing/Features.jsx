import "../../styles/features.css";

const Features = () => {

    const featureData = [

        {
            title: "Repository Workflows",

            description:
            "Track commits, manage branches, handle merges, and organize repositories with structured version control workflows."
        },

        {
            title: "Cloud Asset Storage",

            description:
            "Integrated AWS S3 storage for scalable file handling, media uploads, and repository asset management."
        },

        {
            title: "Team Collaboration",

            description:
            "Work together through issue tracking, shared repositories, and streamlined development workflows."
        },

        {
            title: "Secure Authentication",

            description:
            "JWT-based authentication system with protected routes and secure access management."
        }
    ];

    return (

        <section className="features">

            <div className="features-header">

                <p className="features-tag">
                    platform capabilities
                </p>

                <h2 className="features-title">

                    Everything needed
                    to manage development workflows.

                </h2>

            </div>

            <div className="features-grid">

                {featureData.map((feature, index) => (

                    <div
                        className="feature-card"
                        key={index}
                    >

                        <h3>
                            {feature.title}
                        </h3>

                        <p>
                            {feature.description}
                        </p>

                    </div>

                ))}

            </div>

        </section>
    );
};

export default Features;