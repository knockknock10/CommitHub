import "../../styles/hero.css";

const Hero = () => {

    return (

        <section className="hero">

            <div className="hero-content">

                <p className="hero-tag">
                    version control for modern teams
                </p>

                <h1 className="hero-title">

                    Build software
                    without losing track
                    of your workflow.

                </h1>

                <p className="hero-description">

                    CommitHub helps developers manage
                    repositories, track commits, collaborate
                    with teams, and ship projects faster.

                </p>

                <div className="hero-buttons">

                    <a
                        href="/signup"
                        className="primary-btn"
                    >
                        Start Building
                    </a>

                    <a
                        href="/"
                        className="secondary-btn"
                    >
                        Explore Platform
                    </a>

                </div>

            </div>

        </section>
    );
};

export default Hero;