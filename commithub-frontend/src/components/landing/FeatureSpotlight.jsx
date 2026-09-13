const FeatureSpotlight = ({ title, subtitle, description, icon: Icon, image, reverse }) => {
    return (
        <section className={`landing-spotlight ${reverse ? 'reverse' : ''}`}>
            <div className="spotlight-container">
                <div className="spotlight-text">
                    <div className="spotlight-icon">
                        <Icon size={24} />
                    </div>
                    <h2 className="spotlight-title">{title}</h2>
                    <h3 className="spotlight-subtitle">{subtitle}</h3>
                    <p className="spotlight-description">{description}</p>
                </div>
                <div className="spotlight-visual">
                    <div className="visual-container">
                        {image}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeatureSpotlight;
