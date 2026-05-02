import { Country } from "country-state-city";
import { useState } from "react";

const SignUp = () => {
    const [countries] = useState(Country.getAllCountries());
    const [selectedCountry, setSelectedCountry] = useState("");

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        username: ""
    });
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };
    const handleCountryChange = (e) => {
        setSelectedCountry(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        console.log({
            ...formData,
            country: selectedCountry
        });
    };

    return (
        <div className="signup-container">
            <h3>Sign up for CommitHub</h3>
            <p>
                Already have an account? <a href="#">Sign in</a>
            </p>

            <form onSubmit={handleSubmit}>
                <label>
                    Email*
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </label>

                <label>
                    Password*
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <p>
                        Password should be at least 15 characters OR at least 8
                        characters including a number and a lowercase letter.
                    </p>
                </label>

                <label>
                    Username*
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    <p>
                        Username may only contain alphanumeric characters or
                        single hyphens, and cannot begin or end with a hyphen.
                    </p>
                </label>

                <label>
                    Country
                    <select
                        value={selectedCountry}
                        onChange={handleCountryChange}
                    >
                        <option value="">Select Country</option>
                        {countries.map((c) => (
                            <option key={c.isoCode} value={c.isoCode}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>

                <button type="submit">Create account</button>
            </form>
        </div>
    );
};

export default SignUp;