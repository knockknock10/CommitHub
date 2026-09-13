import { useState } from "react";

const CodeSwitcher = () => {
    const [activeTab, setActiveTab] = useState("cli");

    const codeSamples = {
        cli: {
            title: "Command Line",
            code: `# Clone your repository
<span class="keyword">git</span> clone https://commithub.com/user/project.git

# Create a new feature branch
<span class="keyword">git</span> checkout -b feature/new-api-endpoint

# Push changes to CommitHub
<span class="keyword">git</span> push origin feature/new-api-endpoint`
        },
        api: {
            title: "REST API",
            code: `{
  <span class="keyword">"action"</span>: <span class="str">"create_pull_request"</span>,
  <span class="keyword">"repository"</span>: <span class="str">"user/project"</span>,
  <span class="keyword">"head"</span>: <span class="str">"feature/new-api"</span>,
  <span class="keyword">"base"</span>: <span class="str">"main"</span>,
  <span class="keyword">"title"</span>: <span class="str">"Add new API endpoint"</span>
}`
        },
        web: {
            title: "Web UI",
            code: `// Pull Request Review
<span class="keyword">const</span> review = <span class="keyword">await</span> commitHub.reviews.create({
  prId: <span class="num">42</span>,
  status: <span class="str">"APPROVED"</span>,
  comment: <span class="str">"Looks great! Ready to merge."</span>
});`
        }
    };

    return (
        <section className="landing-code-switcher">
            <div className="code-switcher-container">
                <div className="code-switcher-tabs">
                    {Object.keys(codeSamples).map((tab) => (
                        <button 
                            key={tab} 
                            className={`code-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {codeSamples[tab].title}
                        </button>
                    ))}
                </div>
                <div className="code-switcher-window">
                    <div className="code-window-header">
                        <div className="code-dots">
                            <span className="dot red" />
                            <span className="dot yellow" />
                            <span className="dot green" />
                        </div>
                        <span className="code-window-title">{codeSamples[activeTab].title}</span>
                    </div>
                    <div className="code-window-body">
                        <pre dangerouslySetInnerHTML={{ __html: codeSamples[activeTab].code }} />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CodeSwitcher;
