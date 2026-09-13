const steps = [
    { cmd: "$ ch clone my-app", desc: "Bring a repo into CommitHub. SSH, HTTPS, or one-click import." },
    { cmd: "$ ch pr open feat/auth", desc: "Create a branch, push, open a pull request — all from the CLI." },
    { cmd: "$ ch ci run", desc: "Trigger your pipeline. Tests run, containers build, artifacts publish." },
    { cmd: "$ ch merge --squash", desc: "Review, approve, merge. Squash lands on main and deploy follows." }
];

const Workflow = () => {
    return (
        <section className="ch-workflow" id="workflow">
            <div className="ch-section-inner">
                <div className="ch-section-header ch-section-header-centered">
                    <h2 className="ch-section-title">From clone to deploy</h2>
                    <p className="ch-section-desc">
                        Four commands to go from a fresh clone to a merged pull request
                        and a deployed release.
                    </p>
                </div>
                <div className="ch-workflow-steps">
                    {steps.map((s, i) => (
                        <div key={i} className="ch-workflow-step-group">
                            <div className="ch-workflow-step">
                                <div className="ch-workflow-step-num">{i + 1}</div>
                                <span className="ch-workflow-cmd">{s.cmd}</span>
                                <p className="ch-workflow-step-desc">{s.desc}</p>
                            </div>
                            {i < steps.length - 1 && (
                                <span className="ch-workflow-arrow" aria-hidden="true">→</span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="ch-workflow-install">
                    <div className="ch-install-code">
                        <span className="ch-install-prompt">$</span>
                        <span className="ch-install-cmd">curl -fsSL https://cli.commit-hub.app/install</span>
                        <span className="ch-install-pipe">|</span>
                        <span className="ch-install-flag">bash</span>
                        <span className="ch-install-pipe">&&</span>
                        <span className="ch-install-sha">ch --version</span>
                        <span className="ch-install-pipe">&&</span>
                        <span className="ch-install-url">ch login</span>
                    </div>
                    <a href="/signup" className="ch-hero-cta ch-hero-cta-primary ch-install-btn">
                        Install CLI
                        <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Workflow;
