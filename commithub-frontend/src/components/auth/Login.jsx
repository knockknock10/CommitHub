import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../api/authApi";
import "./auth.css";

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError("");
            const data = await loginUser(formData);
            // Store in localStorage directly — AuthContext reads from there
            const userData = data.user || { userName: data.userName, _id: data._id };
            userData.token = data.token;
            localStorage.setItem("commithub-user", JSON.stringify(userData));
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-brand">
                    <div className="auth-logo">
                        <svg viewBox="0 0 32 32" fill="none" width="28" height="28" aria-hidden="true">
                            <path d="M16 4L4 10l12 6 12-6-12-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M4 18l12 6 12-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h1 className="auth-title">Sign in to CommitHub</h1>
                </div>
                
                <p className="auth-subtitle">Enter your credentials to access your repository.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-input-group">
                        <label className="auth-input-label">Username or email address</label>
                        <input
                            type="email"
                            name="email"
                            className="auth-input"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="auth-input-group">
                        <label className="auth-input-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="auth-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    <button className="auth-submit-btn" type="submit" disabled={loading}>
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <div className="auth-footer">
                    New to CommitHub? <Link to="/signup">Create an account</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
