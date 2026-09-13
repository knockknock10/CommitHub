import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
    createRepository
} from "../../api/repositoryApi";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import "./repo.css";

const CreateRepoModal = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
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
            navigate("/repositories");
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
                    <p>Repositories contain all your code, files, and change history.</p>
                </div>

                <form className="create-repo-form" onSubmit={handleSubmit}>
                    <div className="create-repo-section">
                        <div className="create-step-circle">1</div>
                        <div className="create-repo-section-content">
                            <h2>General</h2>
                            <div className="create-repo-name-wrapper">
                                <div className="create-repo-input-box">
                                    <label>Owner</label>
                                    <div className="owner-display">
                                        {user?.userName || "User"}
                                    </div>
                                </div>
                                <span className="create-slash">/</span>
                                <div className="create-repo-input-box create-repo-flex">
                                    <Input
                                        label="Repository name *"
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="my-awesome-project"
                                        required
                                    />
                                </div>
                            </div>
                            <p className="create-repo-hint">Great repository names are short and memorable.</p>
                            <div className="create-repo-input-box">
                                <Textarea
                                    label="Description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="A brief description of your project"
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
                                <div className="create-config-right">
                                    <Select 
                                        name="visibility" 
                                        value={formData.visibility} 
                                        onChange={handleChange}
                                        options={[
                                            { label: "Public", value: "public" },
                                            { label: "Private", value: "private" },
                                        ]}
                                    />
                                </div>
                            </div>
                            <div className="create-config-card">
                                <div className="create-config-left">
                                    <h3>Add README</h3>
                                    <p>README files are displayed on the front page.</p>
                                </div>
                                <div className="create-config-right">
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
                            </div>
                            <div className="create-config-card">
                                <div className="create-config-left">
                                    <h3>Add .gitignore</h3>
                                    <p>Choose which files not to track.</p>
                                </div>
                                <div className="create-config-right">
                                    <Select 
                                        name="gitignore" 
                                        value={formData.gitignore} 
                                        onChange={handleChange}
                                        options={[
                                            { label: "None", value: "" },
                                            { label: "Node", value: "node" },
                                            { label: "React", value: "react" },
                                            { label: "Python", value: "python" },
                                        ]}
                                    />
                                </div>
                            </div>
                            <div className="create-config-card">
                                <div className="create-config-left">
                                    <h3>Add license</h3>
                                    <p>Let others know what they can do with your code.</p>
                                </div>
                                <div className="create-config-right">
                                    <Select 
                                        name="license" 
                                        value={formData.license} 
                                        onChange={handleChange}
                                        options={[
                                            { label: "No license", value: "" },
                                            { label: "MIT License", value: "MIT" },
                                            { label: "Apache 2.0", value: "Apache" },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && <p className="create-repo-error">{error}</p>}
                    <div className="create-repo-actions">
                        <Button
                            type="button"
                            className="create-cancel-btn"
                            onClick={() => navigate("/repositories")}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="create-btn"
                            disabled={loading}
                            loading={loading}
                            variant="primary"
                        >
                            {loading ? "Creating repository..." : "Create repository"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRepoModal;