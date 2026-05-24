import "../../styles/footer.css";

const Footer = () => {

    return (

        <footer className="footer">

            <div className="footer-top">

                <div className="footer-brand">

                    <h2>
                        CommitHub
                    </h2>

                    <p>

                        Repository management and
                        collaboration platform built
                        for modern development workflows.

                    </p>

                </div>

                <div className="footer-links">

                    <div className="footer-column">

                        <h4>
                            platform
                        </h4>

                        <a href="/">
                            repositories
                        </a>

                        <a href="/">
                            issues
                        </a>

                        <a href="/">
                            pull requests
                        </a>

                        <a href="/">
                            activity
                        </a>

                    </div>

                    <div className="footer-column">

                        <h4>
                            resources
                        </h4>

                        <a href="/">
                            documentation
                        </a>

                        <a href="/">
                            api
                        </a>

                        <a href="/">
                            guides
                        </a>

                        <a href="/">
                            support
                        </a>

                    </div>

                    <div className="footer-column">

                        <h4>
                            company
                        </h4>

                        <a href="/">
                            about
                        </a>

                        <a href="/">
                            privacy
                        </a>

                        <a href="/">
                            terms
                        </a>

                        <a href="/">
                            contact
                        </a>

                    </div>

                </div>

            </div>

            <div className="footer-bottom">

                <p>
                    © 2026 CommitHub. All rights reserved.
                </p>

                <div className="footer-socials">

                    <a href="/">
                        github
                    </a>

                    <a href="/">
                        linkedin
                    </a>

                    <a href="/">
                        twitter
                    </a>

                </div>

            </div>

        </footer>
    );
};

export default Footer;