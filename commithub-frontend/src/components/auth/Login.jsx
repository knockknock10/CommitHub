import { useState } from "react";

import { useNavigate }
from "react-router-dom";

import { useAuth }
from "../../context/AuthContext";

import { loginUser }
from "../../api/authApi";

import "./auth.css";

const Login = () => {

    const navigate = useNavigate();

    const { login } = useAuth();

    const [loading, setLoading] =
    useState(false);

    const [error, setError] =
    useState("");

    const [formData, setFormData] =
    useState({

        email: "",
        password: ""
    });

    const handleChange = (e) => {

        const { name, value } =
        e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try{

            setLoading(true);

            setError("");

            const data =
            await loginUser(formData);

            login(data);

            navigate("/dashboard");

        }catch(error){

            setError(

                error.response?.data?.message ||

                "login failed"
            );

        }finally{

            setLoading(false);
        }
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

                    Continue building,
                    collaborating, and managing
                    repositories.

                </p>

                <p className="signin">

                    New to CommitHub?

                    <a href="/signup">
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
                            ? "Signing in..."
                            : "Sign in to CommitHub"
                        }

                    </button>

                </form>

            </div>

        </div>
    );
};

export default Login;