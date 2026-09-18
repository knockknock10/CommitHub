import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, signupUser } from "../api/authApi";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,34}$/;
const MIN_PASSWORD = 8;

const DEMO_EMAIL = "sanjeev@example.com";
const DEMO_PASSWORD = "DevPassword123!";

const CopyIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
        <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
        <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const EyeIcon = ({ off }) => (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
        {off ? (
            <>
                <path d="M2.3 2.3l15.4 15.4M10 5.5C6.5 5.5 3.5 7.5 1.5 10c2 2.5 5 4.5 8.5 4.5s6.5-2 8.5-4.5c-2-2.5-5-4.5-8.5-4.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
            </>
        ) : (
            <>
                <path d="M10 4C5 4 2 10 2 10s3 6 8 6 8-6 8-6-3-6-8-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
            </>
        )}
    </svg>
);

const passwordStrength = (pw) => {
    if (!pw) return { score: 0, label: "" };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score += 1;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    return { score, label: labels[score] };
};

const toErrorMessage = (err) => {
    if (err?.offline) {
        return "Server unreachable — please check your connection and try again.";
    }
    const serverMessage = err?.response?.data?.message;
    if (typeof serverMessage === "string" && serverMessage.trim()) {
        return serverMessage.trim();
    }
    if (err && err.name === "AuthError") {
        const curated = typeof err.message === "string" ? err.message.trim() : "";
        if (curated) {
            return curated;
        }
    }
    const status = err?.response?.status;
    if (status === 404 || status === 503) {
        return "The sign-in service is temporarily unavailable. Please try again.";
    }
    const raw = typeof err?.message === "string" ? err.message : "";
    if (raw.includes("unreachable")) {
        return "Server unreachable — please check your connection and try again.";
    }
    if (raw.includes("timeout")) {
        return "The server took too long to respond. Please try again.";
    }
    if (raw.includes("Network")) {
        return "Network error — please check your connection and try again.";
    }
    return "Something went wrong. Please try again.";
};

const DemoCredentials = ({ email, password, onUse }) => {
    const [copied, setCopied] = useState("");

    const copy = async (value, label) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            try {
                const ta = document.createElement("textarea");
                ta.value = value;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
            } catch {
                return;
            }
        }
        setCopied(label);
        window.setTimeout(() => setCopied(""), 2000);
    };

    return (
        <div className="ch-auth-demo">
            <div className="ch-auth-demo-head">
                <span className="ch-auth-demo-title">Demo account</span>
                <button
                    type="button"
                    className="ch-auth-demo-fill"
                    onClick={onUse}
                >
                    Use demo credentials
                </button>
            </div>
            <div className="ch-auth-demo-grid">
                <div className="ch-auth-demo-item">
                    <span className="ch-auth-demo-label">Email</span>
                    <div className="ch-auth-demo-value">
                        <code>{email}</code>
                        <button
                            type="button"
                            className="ch-auth-demo-copy"
                            onClick={() => copy(email, "email")}
                            aria-label="Copy demo email"
                        >
                            {copied === "email" ? <CheckIcon /> : <CopyIcon />}
                        </button>
                    </div>
                </div>
                <div className="ch-auth-demo-item">
                    <span className="ch-auth-demo-label">Password</span>
                    <div className="ch-auth-demo-value">
                        <code>{password}</code>
                        <button
                            type="button"
                            className="ch-auth-demo-copy"
                            onClick={() => copy(password, "password")}
                            aria-label="Copy demo password"
                        >
                            {copied === "password" ? <CheckIcon /> : <CopyIcon />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AuthPage = () => {
    const { user, loading: authLoading, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isSignup = location.pathname === "/signup";

    const [form, setForm] = useState({
        email: "",
        userName: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState("");

    useEffect(() => {
        setErrors({});
        setServerError("");
        setShowPassword(false);
        setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
    }, [isSignup]);

    if (authLoading) {
        return (
            <div className="ch-auth-page">
                <div className="ch-auth-loading">
                    <span className="ch-spinner" aria-hidden="true" />
                    Loading…
                </div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const validate = () => {
        const e = {};
        const email = form.email.trim();
        if (!email) e.email = "Email is required";
        else if (!EMAIL_RE.test(email)) e.email = "Enter a valid email address";

        if (!form.password) e.password = "Password is required";
        else if (form.password.length < MIN_PASSWORD) {
            e.password = `Password must be at least ${MIN_PASSWORD} characters`;
        }

        if (isSignup) {
            const userName = form.userName.trim();
            if (!userName) e.userName = "Username is required";
            else if (!USERNAME_RE.test(userName)) {
                e.userName = "Username must be 3–34 characters: letters, numbers, - and _";
            }
            if (!form.confirmPassword) e.confirmPassword = "Please confirm your password";
            else if (form.confirmPassword !== form.password) {
                e.confirmPassword = "Passwords do not match";
            }
        }
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length) return;

        setServerError("");
        setSubmitting(true);

        try {
            const payload = isSignup
                ? {
                      email: form.email.trim().toLowerCase(),
                      userName: form.userName.trim().toLowerCase(),
                      password: form.password,
                  }
                : {
                      email: form.email.trim().toLowerCase(),
                      password: form.password,
                  };

            const data = isSignup ? await signupUser(payload) : await loginUser(payload);
            const storedUser = (data.user && { ...data.user }) || {};
            if (!storedUser._id && data._id) storedUser._id = data._id;
            if (!storedUser.userName && data.userName) storedUser.userName = data.userName;
            storedUser.token = data.token;

            login(storedUser);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setSubmitting(false);
            setServerError(toErrorMessage(err));
        }
    };

    const handleChange = (key) => (e) => {
        const value = e.target.value;
        setForm((f) => ({ ...f, [key]: value }));
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: "" }));
        }
    };

    const strength = passwordStrength(form.password);

    return (
        <div className="ch-auth-page">
            <div className="ch-auth-shell">
                <div className="ch-auth-brand">
                    <svg viewBox="0 0 32 32" fill="none" width="26" height="26" aria-hidden="true">
                        <path d="M16 2L2 9l14 7 14-7-14-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 23l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 16l14 7 14-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>CommitHub</span>
                </div>

                <main className="ch-auth-card">
                    <div className="ch-auth-head">
                        <h1 className="ch-auth-title">
                            {isSignup ? "Create your account" : "Sign in to CommitHub"}
                        </h1>
                        <p className="ch-auth-sub">
                            {isSignup
                                ? "Start building and collaborating in minutes."
                                : "Enter your details to access your repositories."}
                        </p>
                    </div>

                    {serverError && (
                        <div className="ch-auth-alert" role="alert">
                            {serverError}
                        </div>
                    )}

                    <form className="ch-auth-form" onSubmit={handleSubmit} noValidate>
                        {isSignup && (
                            <div className="ch-form-group">
                                <label className="ch-form-label" htmlFor="signup-username">
                                    Username
                                </label>
                                <input
                                    id="signup-username"
                                    name="userName"
                                    type="text"
                                    className={`ch-form-input ${errors.userName ? "ch-form-input-err" : ""}`}
                                    placeholder="johndoe"
                                    autoComplete="username"
                                    spellCheck="false"
                                    value={form.userName}
                                    onChange={handleChange("userName")}
                                    disabled={submitting}
                                    aria-invalid={Boolean(errors.userName)}
                                    aria-describedby={errors.userName ? "signup-username-error" : undefined}
                                    autoFocus
                                />
                                {errors.userName && (
                                    <span id="signup-username-error" className="ch-form-err-inline">
                                        {errors.userName}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className="ch-form-group">
                            <label className="ch-form-label" htmlFor={`${isSignup ? "signup" : "login"}-email`}>
                                Email address
                            </label>
                            <input
                                id={`${isSignup ? "signup" : "login"}-email`}
                                name="email"
                                type="email"
                                className={`ch-form-input ${errors.email ? "ch-form-input-err" : ""}`}
                                placeholder="you@example.com"
                                autoComplete="email"
                                value={form.email}
                                onChange={handleChange("email")}
                                disabled={submitting}
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? "auth-email-error" : undefined}
                                autoFocus={!isSignup}
                            />
                            {errors.email && (
                                <span id="auth-email-error" className="ch-form-err-inline">
                                    {errors.email}
                                </span>
                            )}
                        </div>

                        <div className="ch-form-group">
                            <label
                                className="ch-form-label"
                                htmlFor={`${isSignup ? "signup" : "login"}-password`}
                            >
                                Password
                            </label>
                            <div className="ch-pwd-wrap">
                                <input
                                    id={`${isSignup ? "signup" : "login"}-password`}
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    className={`ch-form-input ${errors.password ? "ch-form-input-err" : ""}`}
                                    placeholder={isSignup ? "At least 8 characters" : ""}
                                    autoComplete={isSignup ? "new-password" : "current-password"}
                                    value={form.password}
                                    onChange={handleChange("password")}
                                    disabled={submitting}
                                    aria-invalid={Boolean(errors.password)}
                                    aria-describedby={errors.password ? "auth-password-error" : undefined}
                                />
                                <button
                                    type="button"
                                    className="ch-pwd-toggle"
                                    onClick={() => setShowPassword((s) => !s)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    disabled={submitting}
                                >
                                    <EyeIcon off={showPassword} />
                                </button>
                            </div>
                            {errors.password && (
                                <span id="auth-password-error" className="ch-form-err-inline">
                                    {errors.password}
                                </span>
                            )}
                            {isSignup && !errors.password && (
                                <span className="ch-password-hint">Use at least 8 characters.</span>
                            )}
                            {isSignup && form.password && (
                                <div className="ch-strength" aria-live="polite">
                                    <div className="ch-strength-segs">
                                        {[1, 2, 3, 4].map((i) => (
                                            <span
                                                key={i}
                                                className={`ch-strength-seg ${i <= strength.score ? `ch-strength-${strength.score}` : ""}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="ch-strength-label">{strength.label}</span>
                                </div>
                            )}
                        </div>

                        {isSignup && (
                            <div className="ch-form-group">
                                <label className="ch-form-label" htmlFor="signup-confirm">
                                    Confirm password
                                </label>
                                <input
                                    id="signup-confirm"
                                    name="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    className={`ch-form-input ${errors.confirmPassword ? "ch-form-input-err" : ""}`}
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    value={form.confirmPassword}
                                    onChange={handleChange("confirmPassword")}
                                    disabled={submitting}
                                    aria-invalid={Boolean(errors.confirmPassword)}
                                    aria-describedby={errors.confirmPassword ? "signup-confirm-error" : undefined}
                                />
                                {errors.confirmPassword && (
                                    <span id="signup-confirm-error" className="ch-form-err-inline">
                                        {errors.confirmPassword}
                                    </span>
                                )}
                            </div>
                        )}

                        <button type="submit" className="ch-auth-btn" disabled={submitting}>
                            {submitting && <span className="ch-spinner" aria-hidden="true" />}
                            {submitting
                                ? isSignup
                                    ? "Creating account…"
                                    : "Signing in…"
                                : isSignup
                                  ? "Create account"
                                  : "Sign in"}
                        </button>
                    </form>

                    <p className="ch-auth-switch">
                        {isSignup ? (
                            <>
                                Already have an account? <Link to="/login">Sign in</Link>
                            </>
                        ) : (
                            <>
                                New to CommitHub? <Link to="/signup">Create an account</Link>
                            </>
                        )}
                    </p>

                    {!isSignup && (
                        <DemoCredentials
                            email={DEMO_EMAIL}
                            password={DEMO_PASSWORD}
                            onUse={() => {
                                setForm((f) => ({ ...f, email: DEMO_EMAIL, password: DEMO_PASSWORD }));
                                setErrors({});
                                setServerError("");
                            }}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export default AuthPage;