import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    createRepository
} from "../../api/repositoryApi";
import "./repo.css";

const CreateRepoModal = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        visibility: "public",
        readme: false,
        gitignore: "",
        license: ""
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            setLoading(true);
            await createRepository(formData);
            navigate("/dashboard");
        } catch (error) {
            setError(error.response?.data?.message || "Failed to create repository");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-repo-page">
            <div className="create-repo-container">
                <div className="create-repo-top">
                    <h1>Create a new repository</h1>
                    <p>Repositories contain all your project’s files and revision history.</p>
                </div>

                <form className="create-repo-form" onSubmit={handleSubmit}>
                    <div className="create-repo-section">
                        <div className="create-step-circle">1</div>
                        <div className="create-repo-section-content">
                            <h2>General</h2>
                            <div className="create-repo-name-wrapper">
                                <div className="create-repo-input-box">
                                    <label>Owner</label>
                                    <select>
                                        <option>Sanjeev-Kumar</option>
                                    </select>
                                </div>
                                <span className="create-slash">/</span>
                                <div className="create-repo-input-box create-repo-flex">
                                    <label>Repository name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="commithub-frontend"
                                        required
                                    />
                                </div>
                            </div>
                            <p className="create-repo-hint">Great repository names are short and memorable.</p>
                            <div className="create-repo-input-box">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Write a short description"
                                    rows="4"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="create-repo-section">
                        <div className="create-step-circle">2</div>
                        <div className="create-repo-section-content">
                            <h2>Configuration</h2>
                            <div className="create-config-card">
                                <div className="create-config-left">
                                    <h3>Choose visibility *</h3>
                                    <p>Choose who can see and commit to this repository.</p>
                                </div>
                                <select name="visibility" value={formData.visibility} onChange={handleChange}>
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>
                            <div className="create-config-card">
                                <div className="create-config-left">
                                    <h3>Add README</h3>
                                    <p>README files are displayed on the front page.</p>
                                </div>
                                <label className="create-switch">
                                    <input
                                        type="checkbox"
                                        name="readme"
                                        checked={formData.readme}
                                        onChange={handleChange}
                                    />
                                    <span className="create-slider"></span>
                                </label>
                            </div>
                            <div className="create-config-card">
                                <div className="create-config-left">
                                    <h3>Add .gitignore</h3>
                                    <p>Choose which files not to track.</p>
                                </div>
                                <select name="gitignore" value={formData.gitignore} onChange={handleChange}>
                                    <option value="">None</option>
                                    <option value="node">Node</option>
                                    <option value="react">React</option>
                                    <option value="python">Python</option>
                                </select>
                            </div>
                            <div className="create-config-card">
                                <div className="create-config-left">
                                    <h3>Add license</h3>
                                    <p>Let others know what they can do with your code.</p>
                                </div>
                                <select name="license" value={formData.license} onChange={handleChange}>
                                    <option value="">No license</option>
                                    <option value="MIT">MIT License</option>
                                    <option value="Apache">Apache 2.0</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {error && <p className="create-repo-error">{error}</p>}
                    <div className="create-repo-actions">
                        <button type="button" className="create-cancel-btn" onClick={() => navigate("/dashboard")}>Cancel</button>
                        <button type="submit" className="create-btn" disabled={loading}>
                            {loading ? "Creating repository..." : "Create repository"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRepoModal;