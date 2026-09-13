const Testimonials = () => {
    const testimonials = [
        {
            name: "Sarah Drasner",
            role: "Engineering Manager @ TechCorp",
            content: "CommitHub has completely transformed how our team handles code reviews. The clarity and speed are unmatched.",
            avatar: "https://i.pravatar.cc/150?u=sarah"
        },
        {
            name: "Alex Rivera",
            role: "Open Source Contributor",
            content: "The most intuitive version control platform I've ever used. It just gets out of the way and lets me code.",
            avatar: "https://i.pravatar.cc/150?u=alex"
        },
        {
            name: "Jordan Lee",
            role: "CTO @ StartupX",
            content: "Scaling our engineering team was a nightmare until we moved to CommitHub. The enterprise tools are a lifesaver.",
            avatar: "https://i.pravatar.cc/150?u=jordan"
        }
    ];

    return (
        <section className="landing-testimonials">
            <div className="testimonials-header">
                <h2>Loved by developers worldwide</h2>
                <p>Join thousands of teams shipping better software.</p>
            </div>

            <div className="testimonials-grid">
                {testimonials.map((t, index) => (
                    <div className="testimonial-card" key={index}>
                        <div className="testimonial-content">"{t.content}"</div>
                        <div className="testimonial-author">
                            <img src={t.avatar} alt={t.name} className="testimonial-avatar" />
                            <div className="testimonial-info">
                                <span className="testimonial-name">{t.name}</span>
                                <span className="testimonial-role">{t.role}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default Testimonials;
