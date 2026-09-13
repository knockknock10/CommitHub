const CTA = () => {
    return (
        <section className="ch-cta">
            <div className="ch-section-inner">
                <div className="ch-cta-inner">
                    <h2 className="ch-section-title">Start building on CommitHub today.</h2>
                    <p className="ch-cta-desc">
                        Free for individuals and small teams. No credit card required.
                        Set up your first repo in under two minutes.
                    </p>
                    <div className="ch-cta-actions">
                        <a href="/signup" className="ch-hero-cta ch-hero-cta-primary ch-cta-primary-btn">
                            Start building free
                            <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
                                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </a>
                        <a href="/login" className="ch-hero-cta ch-hero-cta-ghost ch-cta-ghost-btn">
                            Sign in to dashboard
                        </a>
                    </div>
                    <div className="ch-cta-trust">
                        <span className="ch-cta-trust-item">
                            <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
                                <path d="M8 14.5s5.5-4 5.5-9.5V6l-5.5-2.5-5.5 2.5v-2c0 5.5 5.5 9.5 5.5 9.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M6.5 8l1 1 2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            SOC 2 Type II
                        </span>
                        <span className="ch-cta-trust-sep">/</span>
                        <span className="ch-cta-trust-item">
                            <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
                                <rect x="3.5" y="7.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                                <path d="M7.5 7.5V5a2.5 2.5 0 015 0v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                            </svg>
                            Encrypted at rest & in transit
                        </span>
                        <span className="ch-cta-trust-sep">/</span>
                        <span className="ch-cta-trust-item">
                            <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
                                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
                                <path d="M8 5v4.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            99.9% uptime SLA
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CTA;
