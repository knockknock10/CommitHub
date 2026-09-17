import { useNavigate } from "react-router-dom";

const Hero = () => {
    const navigate = useNavigate();

    return (
        <section className="ch-hero">
            <div className="ch-hero-grain" aria-hidden="true" />
            <div className="ch-hero-content">
                <p className="ch-hero-eyebrow">your code, one place</p>
                <h1 className="ch-hero-title">
                    all your repos.
                    <br />
                    <span className="ch-hero-title-accent">one dashboard.</span>
                </h1>
                <p className="ch-hero-desc">
                    Track issues, review pull requests, and stay on top of
                    every repo — from one place.
                </p>
                <div className="ch-hero-actions">
                    <a href="/signup" className="ch-hero-cta ch-hero-cta-primary">
                        Start building free
                        <svg viewBox="0 0 16 16" fill="none" width="12" height="12" aria-hidden="true">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </a>
                    <a href="/login" className="ch-hero-cta ch-hero-cta-ghost">
                        Sign in
                    </a>
                </div>
            </div>
            <div className="ch-hero-visual">
                <div className="ch-app-window">
                    <div className="ch-app-window-bar">
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
                    <div className="ch-app-content">
                        <div className="ch-app-sidebar">
                            <div className="ch-sidebar-item ch-sidebar-item-active">
                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
                                    <path d="M2 3l-1 2h6l-1-2-1.5 1zM2 7l-1 2h6l-1-2-1.5 1zM2 11l-1 2h6l-1-2-1.5 1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Repos
                            </div>
                            <div className="ch-sidebar-item">
                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
                                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                                    <path d="M7 3.5v4M7 10.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                                Issues
                                <span className="ch-sidebar-count">14</span>
                            </div>
                            <div className="ch-sidebar-item">
                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
                                    <path d="M7 1.5v11M2.5 7c2-1.5 4.5-1.5 5 0M2.5 6.5c2 1.5 4.5 1.5 5 0M2.5 5.5c2-1.5 4.5-1.5 5 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                PRs
                                <span className="ch-sidebar-count">3</span>
                            </div>
                            <div className="ch-sidebar-item">
                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
                                    <rect x="2.5" y="2.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                                    <path d="M4.5 6h5M4.5 8.5h3.5M4.5 4h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                                Pipelines
                            </div>
                            <div className="ch-sidebar-item">
                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
                                    <circle cx="5" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
                                    <path d="M1.5 11.5a2.5 2.5 0 013-1.2M3 7a2.5 2.5 0 001-2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                                Discuss
                            </div>
                            <div className="ch-sidebar-item">
                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
                                    <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                                    <path d="M5 4.5h3l.8.8h.5a1.5 1.5 0 011.2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Packages
                            </div>
                            <div className="ch-sidebar-divider" />
                            <div className="ch-sidebar-item">
                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" aria-hidden="true">
                                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                                    <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
                                </svg>
                                Starred
                            </div>
                        </div>
                        <div className="ch-app-main">
                            <div className="ch-file-tree">
                                <div className="ch-file-tree-header">
                                    <span>explore</span>
                                    <span className="ch-file-tree-badge">main</span>
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-folder">📁</span> .
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-folder">📁</span>  ├── src/
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>  │   ├── client.go
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>  │   └── errors.go
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-folder">📁</span>  ├── cmd/
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>  │   └── main.go
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>  ├── go.mod
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>  ├── README.md
                                </div>
                                <div className="ch-file-row">
                                    <span className="ch-file-icon ch-file-icon-file">📄</span>  └── LICENSE
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
                                        <span className="ch-code-ln">Ln 72</span>
                                        <span className="ch-code-lang">Go</span>
                                    </div>
                                </div>
                                <div className="ch-code-body"><code>{`package internal

import (
    "context"
    "fmt"
    "net/http"
    "time"

    "github.com/commit-hub/sdk/auth"
    "github.com/commit-hub/sdk/httpclient"
)

// Client handles authenticated API requests.
type Client struct {
    baseURL   string
    token     string
    http      *http.Client
    userAgent string
}

// NewClient creates a client with the given options.
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
}`}</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </section>
    );
};

export default Hero;
