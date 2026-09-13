const RepoPreview = () => {
    return (
        <section className="ch-repo-preview" id="repos">
            <div className="ch-section-inner">
                <div className="ch-repo-preview-grid">
                    <div className="ch-repo-preview-content">
                        <h2 className="ch-section-title">Your repos, your way.</h2>
                        <p className="ch-section-desc">
                            CommitHub stores your repos, issues, PRs, and pipeline runs
                            in one place. Import from another host or start fresh.
                        </p>
                        <div className="ch-repo-preview-stats">
                            <div className="ch-stat">
                                <span className="ch-stat-num">40M+</span>
                                <span className="ch-stat-label">Lines of code indexed</span>
                            </div>
                            <div className="ch-stat">
                                <span className="ch-stat-num">120+</span>
                                <span className="ch-stat-label">Languages supported</span>
                            </div>
                            <div className="ch-stat">
                                <span className="ch-stat-num">3</span>
                                <span className="ch-stat-label">Import sources</span>
                            </div>
                        </div>
                        <a href="/login" className="ch-hero-cta ch-hero-cta-primary">
                            Browse your repos
                            <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
                                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </a>
                    </div>

                    <div className="ch-repo-window">
                        <div className="ch-repo-window-bar">
                            <div className="ch-app-window-dots">
                                <span className="ch-dot ch-dot-red" />
                                <span className="ch-dot ch-dot-yellow" />
                                <span className="ch-dot ch-dot-green" />
                            </div>
                            <div className="ch-app-window-title">
                                <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
                                    <path d="M3 2l4 4-1.2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M3 14L5.5 11l5.5-8 6 3-3 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                commit-hub/app
                            </div>
                            <span className="ch-app-window-badge">sdk</span>
                        </div>

                        <div className="ch-repo-window-body">
                            <div className="ch-file-tree">
                                <div className="ch-file-tree-header">
                                    <span>Files</span>
                                    <span className="ch-file-tree-badge">3 modified</span>
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-folder">📁</span> src/
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-folder">📁</span>    internal/
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>       client.go
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>       errors.go
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-folder">📁</span>    handlers/
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>       repo.go
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>       auth.go
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>    go.mod
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>    README.md
                                </div>
                            </div>

                            <div className="ch-code-window">
                                <div className="ch-code-header">
                                    <div className="ch-code-header-dots">
                                        <span className="ch-dot ch-dot-red" />
                                        <span className="ch-dot ch-dot-yellow" />
                                        <span className="ch-dot ch-dot-green" />
                                    </div>
                                    <span className="ch-code-filename">src/internal/client.go</span>
                                    <div className="ch-code-right">
                                        <span className="ch-code-ln">Ln 56</span>
                                        <span className="ch-code-lang">Go</span>
                                    </div>
                                </div>
                                <div className="ch-code-body"><code>{`
package internal

import (
    "context"
    "fmt"
    "net/http"
    "time"

    "github.com/commit-hub/sdk/auth"
    "github.com/commit-hub/sdk/httpclient"
)

// Client handles authenticated API requests from CommitHub.
type Client struct {
    baseURL   string
    token     string
    http      *http.Client
    userAgent string
}

// NewClient returns a configured API client.
func NewClient(token string, opts ...Option) (*Client, error) {
    c := defaultConfig()
    for _, o := range opts {
        o(c)
    }

    if token == "" {
        return nil, fmt.Errorf("commit-hub: token is required")
    }

    return &Client{
        baseURL:   c.baseURL,
        token:     token,
        http:      httpclient.New(c.timeout),
        userAgent: c.userAgent,
    }, nil
}

// GetRepository returns the full repository object.
func (c *Client) GetRepository(ctx context.Context, owner, repo string) (*Repository, error) {
    req, err := http.NewRequestWithContext(ctx,
        http.MethodGet,
        c.baseURL+"/api/repos/"+owner+"/"+repo,
        nil)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", "Bearer "+c.token)
    req.Header.Set("User-Agent", c.userAgent)

    resp, err := c.http.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var r Repository
    if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
        return nil, err
    }
    return &r, nil
}
`}</code>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default RepoPreview;
