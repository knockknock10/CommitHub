import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import "./auth.css";

const SignUp = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        userName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (formData.password !== formData.confirmPassword) {
            return setError("Passwords do not match");
        }

        try {
            setLoading(true);
            const data = await signupUser({
                userName: formData.userName,
                email: formData.email,
                password: formData.password
            });
            login({ ...data.user, token: data.token });
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-brand">
                    <div className="auth-logo">◉</div>
                    <h1 className="auth-title">Create your account</h1>
                </div>
                
                <p className="auth-subtitle">Join CommitHub to start building and collaborating.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-input-group">
                        <label className="auth-input-label">Username</label>
                        <input
                            type="text"
                            name="userName"
                            className="auth-input"
                            value={formData.userName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="auth-input-group">
                        <label className="auth-input-label">Email address</label>
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
                    <div className="auth-input-group">
                        <label className="auth-input-label">Confirm password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className="auth-input"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    <button className="auth-submit-btn" type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
