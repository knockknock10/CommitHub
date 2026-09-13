import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, signupUser } from "../api/authApi";
import { AuthError } from "../api/axios";

const AuthPage = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({
        email: "",
        password: "",
        userName: "",
        fullName: ""
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState("");

    // If already authenticated, redirect to dashboard
    useEffect(() => {
        if (!authLoading && user) {
            navigate("/dashboard", { replace: true });
        }
    }, [authLoading, user]);

    if (authLoading) {
        return (
            <div className="ch-auth-page">
                <div className="ch-auth-right">
                    <div className="ch-auth-card">
                        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-2)" }}>
                            Loading…
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
        setServerError("");
        setSubmitting(true);

        try {
            if (mode === "login") {
                const data = await loginUser({
                    email: form.email.trim().toLowerCase(),
                    password: form.password
                });
                // Backend returns { token, user: { _id, userName, email } }
                const userData = data.user || { _id: data._id, userName: data.userName || data.email };
                userData.token = data.token;
                localStorage.setItem("commithub-user", JSON.stringify(userData));
                navigate("/dashboard", { replace: true });
            } else {
                const data = await signupUser({
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    userName: form.userName.trim()
                    // Note: backend does not accept fullName — it's UI-only
                });
                const userData = data.user || { _id: data._id, userName: data.userName || data.email };
                userData.token = data.token;
                localStorage.setItem("commithub-user", JSON.stringify(userData));
                navigate("/dashboard", { replace: true });
            }
        } catch (err) {
            setSubmitting(false);
            if (err instanceof AuthError) {
                // Auth error (401) — redirect to login via React Router
                window.location.href = err.redirectTo || "/login";
                return;
            }
            if (err.offline) {
                setServerError("Server unreachable — please check your connection and try again.");
            } else {
                setServerError(err?.response?.data?.message || err?.message || "Something went wrong. Try again.");
            }
        }
    };

    const switchMode = () => {
        setMode(m => m === "login" ? "signup" : "login");
        setErrors({});
        setServerError("");
        setForm(f => ({ ...f, password: "", userName: "", fullName: "" }));
    };

    return (
        <div className="ch-auth-page">
            <div className="ch-auth-left">
                <div className="ch-auth-brand">
                    <Link to="/" className="ch-auth-mark">
                        <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-hidden="true">
                            <path d="M16 2L2 9l14 7 14-7-14-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 23l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 16l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                <path d="M3 4l-1 2h8l-1-2-2 1zM3 8l-1 2h8l-1-2-2 1zM3 12l-1 2h8l-1-2-2 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Public and private repos</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M6 6h8M6 10h5M6 14h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                <circle cx="14" cy="14" r="1.5" fill="currentColor" />
                            </svg>
                            <span>Issues, PRs, and code review</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M10 6v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Real-time activity across repos</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <rect x="2.5" y="2.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M7 7h6M7 10h4M7 4h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                            <span>Teams, roles, and org controls</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M13 13.5a4.5 4.5 0 01-3.5-1.8M13 10a4.5 4.5 0 001.8-3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M4.5 13l3 3M7 16h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Collaborate on code together</span>
                        </div>
                        <div className="ch-auth-feature">
                            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                                <path d="M10 4a6 6 0 100 12 6 6 0 000-12z" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M10 8v4M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span>Discussions for anything else</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="ch-auth-right">
                <div className="ch-auth-card">
                    <div className="ch-auth-tabs" role="tablist">
                        <button
                            className={`ch-auth-tab ${mode === "login" ? "ch-auth-tab-active" : ""}`}
                            onClick={() => { switchMode(); }}
                            role="tab"
                            aria-selected={mode === "login"}
                            disabled={submitting}
                        >
                            Sign in
                        </button>
                        <button
                            className={`ch-auth-tab ${mode === "signup" ? "ch-auth-tab-active" : ""}`}
                            onClick={() => { switchMode(); }}
                            role="tab"
                            aria-selected={mode === "signup"}
                            disabled={submitting}
                        >
                            Create account
                        </button>
                    </div>

                    {serverError && (
                        <div className="ch-auth-form-error" role="alert">
                            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true"><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10 6v4M10 13.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                            {serverError}
                        </div>
                    )}

                    {mode === "login" ? (
                        <form className="ch-auth-form" onSubmit={handleSubmit}>
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
                                    disabled={submitting}
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
                                    disabled={submitting}
                                />
                                {errors.password && <span className="ch-form-err-inline">{errors.password}</span>}
                            </div>
                            <button
                                type="submit"
                                className="ch-auth-btn"
                                disabled={submitting}
                            >
                                {submitting ? "Signing in…" : "Sign in"}
                            </button>
                            <div className="ch-auth-demo">
                                <span>Demo:</span>
                                <code className="ch-auth-demo-code">demoadmin@example.com / DemoPass123!</code>
                            </div>
                        </form>
                    ) : (
                        <form className="ch-auth-form" onSubmit={handleSubmit}>
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
                                    disabled={submitting}
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
                                    disabled={submitting}
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
                                    disabled={submitting}
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
                                    disabled={submitting}
                                />
                                {errors.fullName && <span className="ch-form-err-inline">{errors.fullName}</span>}
                            </div>
                            <button
                                type="submit"
                                className="ch-auth-btn"
                                disabled={submitting}
                            >
                                {submitting ? "Creating account…" : "Create account"}
                            </button>
                            <p className="ch-auth-terms">
                                By creating an account you agree to our{" "}
                                <a href="/login" className="ch-auth-terms-link">Terms of Service</a>
                                {" "}and{" "}
                                <a href="/login" className="ch-auth-terms-link">Privacy Policy</a>.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
