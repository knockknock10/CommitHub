import { Country } from "country-state-city";
import { useState } from "react";
import "./auth.css"
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
        <>
        
            
        <div className="signup-container">
             <h2 id="msg">Sign up for CommitHub</h2>
            <p className="signin">
                Already have an account? <a href="#">Sign in</a>
            </p>
           
            <form className="form" onSubmit={handleSubmit}>
                <div className="firstlast">
                    <label>
                        <input
                            type="text"
                            name="firstname"
                            placeholder="Firstname"
                            value={formData.firstname}
                            onChange={handleChange}
                            required
                        />
                    </label><label>
                        <input
                            type="text"
                            name="lastname"
                            placeholder="Lastname"
                            value={formData.lastname}
                            onChange={handleChange}
                            required
                        />
                    </label>
                </div>
                <div className="country">
                    <label>
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
                </div>
                <div className="email">
                    <label>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </label>
                </div>
                <div className="pwd">
                <label>
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    
                </label>
                </div>
                <div className="btn">
                <label>
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    
                </label>
                </div>
                

                <button type="submit">Create account</button>
            </form>
        </div>
    </>
    );
};

export default SignUp;