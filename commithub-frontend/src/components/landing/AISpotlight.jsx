const AISpotlight = () => {
    return (
        <section className="landing-ai-spotlight">
            <div className="ai-spotlight-container">
                <div className="ai-spotlight-text">
                    <div className="ai-badge">AI POWERED</div>
                    <h2 className="ai-title">Code faster with <span className="ai-accent">HubPilot</span></h2>
                    <p className="ai-description">
                        Our integrated AI assistant helps you write better code, 
                        suggests optimized refactors, and automates the tedious parts 
                        of your workflow. Experience the future of development.
                    </p>
                    <div className="ai-feature-list">
                        <div className="ai-feature-item">
                            <span className="ai-check">✓</span>
                            <span>Intelligent code completions</span>
                        </div>
                        <div className="ai-feature-item">
                            <span className="ai-check">✓</span>
                            <span>Automated PR summaries</span>
                        </div>
                        <div className="ai-feature-item">
                            <span className="ai-check">✓</span>
                            <span>AI-driven security auditing</span>
                        </div>
                    </div>
                </div>
                <div className="ai-spotlight-visual">
                    <div className="ai-chat-window">
                        <div className="ai-chat-header">
                            <span className="ai-bot-name">HubPilot AI</span>
                            <span className="ai-status">Online</span>
                        </div>
                        <div className="ai-chat-body">
                            <div className="ai-msg bot">
                                <span className="ai-msg-text">I've analyzed your merge conflict in <code className="ai-code">main.js</code>. Would you like me to suggest a resolution?</span>
                            </div>
                            <div className="ai-msg user">
                                <span className="ai-msg-text">Yes, please! Focus on preserving the API signatures.</span>
                            </div>
                            <div className="ai-msg bot">
                                <span className="ai-msg-text">Resolving... I've merged the changes and optimized the loop in line 42. Check the diff!</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AISpotlight;
