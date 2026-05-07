import { Country } from "country-state-city";
import { useState } from "react";
import "./auth.css";

const SignUp = () => {

    const [countries] = useState(
        Country.getAllCountries()
    );

    const [selectedCountry, setSelectedCountry] =
    useState("");

    const [formData, setFormData] = useState({

        firstname: "",
        lastname: "",

        day: "",
        month: "",
        year: "",

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
        <div className="page">
            <div className="signup-container">
                <h1 className="brand">
                    CommitHub
                </h1>
                <h2 className="title">
                    Build. Commit. Collaborate.
                </h2>
                <p className="subtitle">
                    Create your CommitHub account and
                    start building your next generation
                    projects with confidence.
                </p>
                <p className="signin">
                    Already part of CommitHub?
                    <a href="/">
                        {" "}Sign in →
                    </a>
                </p>
                <form
                    className="form"
                    onSubmit={handleSubmit}
                >
                    {/* first&last */}
                    <div className="firstlast">
                        <div className="input-group">
                            <input
                                type="text"
                                name="firstname"
                                value={formData.firstname}
                                onChange={handleChange}
                                required
                            />
                            <label>
                                First name
                            </label>
                        </div>
                        <div className="input-group">
                            <input
                                type="text"
                                name="lastname"
                                value={formData.lastname}
                                onChange={handleChange}
                                required
                            />
                            <label>
                                Last name
                            </label>
                        </div>
                    </div>
                    {/* country */}
                    <div className="select-group">
                        <select
                            value={selectedCountry}
                            onChange={handleCountryChange}
                            required
                        >
                            <option value="">
                                Country / Region
                            </option>
                            {countries.map((c) => (
                                <option
                                    key={c.isoCode}
                                    value={c.isoCode}
                                >
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* DOB */}
                    <div className="dob-section">
                        <div className="dob-title">
                            <span>
                                Date of birth
                            </span>
                            <div className="info">
                                ?
                            </div>
                        </div>
                        <div className="dob-inputs">
                            {/* day */}
                            <select
                                name="day"
                                value={formData.day}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Day
                                </option>
                                {[...Array(31)].map((_, i) => (
                                    <option
                                        key={i + 1}
                                        value={i + 1}
                                    >
                                        {i + 1}
                                    </option>
                                ))}
                            </select>
                            {/* month */}
                            <select
                                name="month"
                                value={formData.month}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Month
                                </option>
                                {[
                                    "January",
                                    "February",
                                    "March",
                                    "April",
                                    "May",
                                    "June",
                                    "July",
                                    "August",
                                    "September",
                                    "October",
                                    "November",
                                    "December"
                                ].map((m, i) => (

                                    <option
                                        key={i}
                                        value={m}
                                    >
                                        {m}
                                    </option>
                                ))}
                            </select>

                            {/* year */}
                            <select
                                name="year"
                                value={formData.year}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Year
                                </option>
                                {[...Array(100)].map((_, i) => {
                                    const year =
                                    new Date().getFullYear() - i;
                                    return (
                                        <option
                                            key={year}
                                            value={year}
                                        >
                                            {year}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                    <hr className="divider" />

                    {/* email */}
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

                    {/* pwd */}
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

                    {/* confirm pwd*/}
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

                    {/* BUTTON */}
                    <button
                        className="btn"
                        type="submit"
                    >
                        Create CommitHub Account
                    </button>
                </form>
            </div>
        </div>
    );
};
 
export default SignUp;