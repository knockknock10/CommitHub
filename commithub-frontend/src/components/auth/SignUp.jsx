import {
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    signupUser
} from "../../api/authApi";

import {
    useAuth
} from "../../context/AuthContext";

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
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
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

            login(data);
            navigate("/dashboard");
        } catch (error) {
            setError(error.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="signup-container">
                <h1 className="brand">
                    CommitHub
                </h1>
                <h2 className="title">
                    Create your account.
                </h2>
                <p className="subtitle">
                    Build repositories,
                    manage commits,
                    and collaborate faster.
                </p>
                <p className="signin">
                    Already have an account?
                    <a href="/login">
                        {" "}Sign in →
                    </a>
                </p>
                <form
                    className="form"
                    onSubmit={handleSubmit}
                >
                    <div className="input-group">
                        <input
                            type="text"
                            name="userName"
                            value={formData.userName}
                            onChange={handleChange}
                            required
                        />
                        <label>
                            Username
                        </label>
                    </div>
                    <div className="input-group">
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        <label>
                            Email address
                        </label>
                    </div>
                    <div className="input-group">
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <label>
                            Password
                        </label>
                    </div>
                    <div className="input-group">
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                        <label>
                            Confirm password
                        </label>
                    </div>
                    {error && (
                        <p className="auth-error">
                            {error}
                        </p>
                    )}
                    <button
                        className="btn"
                        type="submit"
                        disabled={loading}
                    >
                        {
                            loading
                            ? "Creating account..."
                            : "Create CommitHub account"
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SignUp;