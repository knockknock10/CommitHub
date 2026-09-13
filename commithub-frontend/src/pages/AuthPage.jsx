import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AuthPage = () => {
    const { login, signup, loading, user } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState("login"); // "login" | "signup"
    const [form, setForm] = useState({
        email: "",
        password: "",
        userName: "",
        fullName: ""
    });
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const validate = () => {
        const e = {};
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
        if (!form.password) e.password = "Password is required";
        else if (form.password.length < 8) e.password = "At least 8 characters";
        if (mode === "signup") {
            if (!form.userName.trim()) e.userName = "Username is required";
            else if (!/^[a-z0-9_-]{3,34}$/.test(form.userName)) e.userName = "3–34 chars, letters, numbers, -, _";
            if (!form.fullName.trim()) e.fullName = "Full name is required";
        }
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors(validate());
        if (Object.keys(errors).length) return;

        setSubmitted(true);
        try {
            if (mode === "login") {
                await login(form.email.trim().toLowerCase(), form.password);
                navigate("/dashboard", { replace: true });
            } else {
                await signup(form.email.trim().toLowerCase(), form.password, form.userName.trim(), form.fullName.trim());
                navigate("/dashboard", { replace: true });
            }
        } catch (err) {
            setErrors({ form: err?.response?.data?.message || err?.message || "Something went wrong. Try again." });
            setSubmitted(false);
        }
    };

    const switchMode = () => {
        setMode(m => m === "login" ? "signup" : "login");
        setErrors({});
        setForm(f => ({ ...f, password: "", userName: "", fullName: "" }));
        setSubmitted(false);
    };

    const withError = (field, input) => input + (errors[field] ? `<span class="ch-form-err">${errors[field]}</span>` : "");

    return (
        <div className="ch-auth-page">
            <div className="ch-auth-left">
                <div className="ch-auth-brand">
                    <Link to="/" className="ch-auth-mark">
                        <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
                            <path d="M16 2L2 9l14 7 14-7-14-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 23l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 16l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        CommitHub
                    </Link>
                </div>
                <div className="ch-auth-left-content">
                    <h1 className="ch-auth-left-title">{mode === "login" ? "Welcome back." : "Join CommitHub."}</h1>
                    <p className="ch-auth-left-desc">
                        {mode === "login"
                            ? "Sign in to your account and pick up where you left off."
                            : "Create an account and get started with your first repo in minutes."}
                    </p>
                    <div className="ch-auth-features">
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <path d="M3 4l-1 2h8l-1-2-2 1zM3 8l-1 2h8l-1-2-2 1zM3 12l-1 2h8l-1-2-2 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Host public and private repos</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M6 6h8M6 10h5M6 14h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                <circle cx="14" cy="14" r="1.5" fill="currentColor"/>
                            </svg>
                            <span>Issues, PRs, and code review in one place</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M10 6v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>CI/CD pipelines defined in YAML</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <rect x="2.5" y="2.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M7 7h6M7 10h4M7 4h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                            <span>Real-time activity across all your repos</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M13 13.5a4.5 4.5 0 01-3.5-1.8M13 10a4.5 4.5 0 001.8-3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M4.5 13l3 3M7 16h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Team access with roles and org controls</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <path d="M10 4a6 6 0 100 12 6 6 0 000-12z" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M10 8v4M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            <span>Discussions for everything outside of issues</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="ch-auth-right">
                <div className="ch-auth-card">
                    {/* Tabs */}
                    <div className="ch-auth-tabs" role="tablist">
                        <button
                            className={`ch-auth-tab ${mode === "login" ? "ch-auth-tab-active" : ""}`}
                            onClick={() => { switchMode(); }}
                            role="tab"
                            aria-selected={mode === "login"}
                        >
                            Sign in
                        </button>
                        <button
                            className={`ch-auth-tab ${mode === "signup" ? "ch-auth-tab-active" : ""}`}
                            onClick={() => { switchMode(); }}
                            role="tab"
                            aria-selected={mode === "signup"}
                        >
                            Create account
                        </button>
                    </div>

                    {/* Form */}
                    {mode === "login" ? (
                        <form className="ch-auth-form" onSubmit={handleSubmit}>
                            {errors.form && (
                                <div className="ch-auth-form-error" role="alert">
                                    <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true"><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                    {errors.form}
                                </div>
                            )}
                            <div className="ch-form-group">
                                <label className="ch-form-label" htmlFor="login-email">Email address</label>
                                <input
                                    id="login-email"
                                    type="email"
                                    className={`ch-form-input ${errors.email ? "ch-form-input-err" : ""}`}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(e2 => ({ ...e2, email: "" })); }}
                                />
                                {errors.email && <span className="ch-form-err-inline">{errors.email}</span>}
                            </div>
                            <div className="ch-form-group">
                                <label className="ch-form-label" htmlFor="login-password">Password</label>
                                <input
                                    id="login-password"
                                    type="password"
                                    className={`ch-form-input ${errors.password ? "ch-form-input-err" : ""}`}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    value={form.password}
                                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(e2 => ({ ...e2, password: "" })); }}
                                />
                                {errors.password && <span className="ch-form-err-inline">{errors.password}</span>}
                            </div>
                            <button
                                type="submit"
                                className="ch-auth-btn"
                                disabled={loading || submitted}
                            >
                                {loading || submitted ? "Signing in…" : "Sign in"}
                            </button>
                            <div className="ch-auth-demo">
                                <span>Demo credentials:</span>
                                <code className="ch-auth-demo-code">demoadmin / DemoPass123!</code>
                            </div>
                        </form>
                    ) : (
                        <form className="ch-auth-form" onSubmit={handleSubmit}>
                            {errors.form && (
                                <div className="ch-auth-form-error" role="alert">
                                    <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true"><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v4M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                    {errors.form}
                                </div>
                            )}
                            <div className="ch-form-group">
                                <label className="ch-form-label" htmlFor="signup-email">Email address</label>
                                <input
                                    id="signup-email"
                                    type="email"
                                    className={`ch-form-input ${errors.email ? "ch-form-input-err" : ""}`}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(e2 => ({ ...e2, email: "" })); }}
                                />
                                {errors.email && <span className="ch-form-err-inline">{errors.email}</span>}
                            </div>
                            <div className="ch-form-group">
                                <label className="ch-form-label" htmlFor="signup-password">Password</label>
                                <input
                                    id="signup-password"
                                    type="password"
                                    className={`ch-form-input ${errors.password ? "ch-form-input-err" : ""}`}
                                    placeholder="At least 8 characters"
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(e2 => ({ ...e2, password: "" })); }}
                                />
                                {errors.password && <span className="ch-form-err-inline">{errors.password}</span>}
                            </div>
                            <div className="ch-form-group">
                                <label className="ch-form-label" htmlFor="signup-username">Username</label>
                                <input
                                    id="signup-username"
                                    type="text"
                                    className={`ch-form-input ${errors.userName ? "ch-form-input-err" : ""}`}
                                    placeholder="johndoe"
                                    autoComplete="username"
                                    value={form.userName}
                                    onChange={e => { setForm(f => ({ ...f, userName: e.target.value })); setErrors(e2 => ({ ...e2, userName: "" })); }}
                                />
                                {errors.userName && <span className="ch-form-err-inline">{errors.userName}</span>}
                            </div>
                            <div className="ch-form-group">
                                <label className="ch-form-label" htmlFor="signup-fullname">Full name</label>
                                <input
                                    id="signup-fullname"
                                    type="text"
                                    className={`ch-form-input ${errors.fullName ? "ch-form-input-err" : ""}`}
                                    placeholder="John Doe"
                                    autoComplete="name"
                                    value={form.fullName}
                                    onChange={e => { setForm(f => ({ ...f, fullName: e.target.value })); setErrors(e2 => ({ ...e2, fullName: "" })); }}
                                />
                                {errors.fullName && <span className="ch-form-err-inline">{errors.fullName}</span>}
                            </div>
                            <button
                                type="submit"
                                className="ch-auth-btn"
                                disabled={loading || submitted}
                            >
                                {loading || submitted ? "Creating account…" : "Create account"}
                            </button>
                            <p className="ch-auth-terms">
                                By creating an account you agree to our{" "}
                                <a href="/CommitHub/login" className="ch-auth-terms-link">Terms of Service</a>
                                {" "}and{" "}
                                <a href="/CommitHub/login" className="ch-auth-terms-link">Privacy Policy</a>.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
