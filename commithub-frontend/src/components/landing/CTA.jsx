import { Link } from "react-router-dom";
import { ChevronRightIcon } from "../ui/icons";

const CTA = () => {
    return (
        <section className="landing-cta">
            <h2>Ready to build with clarity?</h2>
            <p>
                Join developers who keep their workflow in focus on CommitHub.
            </p>
            <div className="landing-cta-actions">
                <Link to="/signup" className="btn primary large">
                    Create your account
                    <ChevronRightIcon size={16} />
                </Link>
            </div>
        </section>
    );
};

export default CTA;