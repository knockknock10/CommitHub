import { useState } from "react";
import "./login.css";

const Login = () => {

    const [formData, setFormData] = useState({

        email: "",
        password: ""
    });
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(formData);
    };

    return (

        <div className="page">
            <div className="login-container">
                <h1 className="brand">
                    CommitHub
                </h1>
                <h2 className="title">
                    Welcome back.
                </h2>
                <p className="subtitle">

                    Continue building, collaborating,
                    and managing your repositories.
                </p>
                <p className="signin">
                    New to CommitHub?
                    <a href="/">
                        {" "}Create account →
                    </a>
                </p>
                <form
                    className="form"
                    onSubmit={handleSubmit}
                >
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
                    <div className="login-options">
                        <label className="remember">
                            <input type="checkbox" />
                            <span>
                                Remember me
                            </span>

                        </label>

                        <a
                            href="/"
                            className="forgot"
                        >
                            Forgot password?
                        </a>
                    </div>
                    <button
                        className="btn"
                        type="submit"
                    >
                        Sign in to CommitHub
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
