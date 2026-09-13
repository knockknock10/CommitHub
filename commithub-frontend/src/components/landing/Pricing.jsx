import { Link } from "react-router-dom";

const Pricing = () => {
    const plans = [
        {
            name: "Free",
            price: "$0",
            description: "Perfect for individuals and small open source projects.",
            features: ["Unlimited public repos", "5GB storage", "Basic CI/CD", "Community support"],
            buttonText: "Get started for free",
            primary: false
        },
        {
            name: "Pro",
            price: "$4",
            description: "Advanced tools for professional developers.",
            features: ["Everything in Free", "Unlimited private repos", "100GB storage", "Advanced security", "Priority support"],
            buttonText: "Upgrade to Pro",
            primary: true
        },
        {
            name: "Enterprise",
            price: "Custom",
            description: "Maximum control and security for organizations.",
            features: ["Everything in Pro", "Single Sign-On (SSO)", "Unlimited storage", "Dedicated manager", "Custom SLAs"],
            buttonText: "Contact Sales",
            primary: false
        }
    ];

    return (
        <section className="landing-pricing" id="pricing">
            <div className="pricing-header">
                <h2>Plans for every stage of growth</h2>
                <p>From a single commit to a global enterprise.</p>
            </div>

            <div className="pricing-grid">
                {plans.map((plan, index) => (
                    <div className={`pricing-card ${plan.primary ? 'highlight' : ''}`} key={index}>
                        <div className="pricing-card-header">
                            <h3 className="pricing-plan-name">{plan.name}</h3>
                            <div className="pricing-plan-price">{plan.price}<span className="price-period">/mo</span></div>
                        </div>
                        <p className="pricing-plan-desc">{plan.description}</p>
                        <ul className="pricing-features">
                            {plan.features.map((feat, fIndex) => (
                                <li key={fIndex}>
                                    <span className="feature-check">✓</span> {feat}
                                </li>
                            ))}
                        </ul>
                        <Link to="/signup" className={`pricing-btn ${plan.primary ? 'btn-primary' : 'btn-outline'}`}>
                            {plan.buttonText}
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Pricing;
