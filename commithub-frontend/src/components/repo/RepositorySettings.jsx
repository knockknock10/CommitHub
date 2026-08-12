import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    deleteRepository,
    updateRepository
} from "../../api/repositoryApi";

const RepositorySettings = ({ repository, onUpdated }) => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: repository.name,
        description: repository.description || "",
        visibility: repository.visibility
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [confirmName, setConfirmName] = useState("");
    const [deleting, setDeleting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: "", text: "" });
        setSaving(true);

        try {
            const updated = await updateRepository(
                repository._id,
                formData
            );
            onUpdated(updated);
            setFormData({
                name: updated.name,
                description: updated.description || "",
                visibility: updated.visibility
            });
            setMessage({
                type: "success",
                text: "Repository updated successfully."
            });
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to update repository"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (confirmName !== repository.name) {
            return;
        }

        setDeleting(true);

        try {
            await deleteRepository(repository._id);
            navigate("/dashboard");
        } catch (error) {
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to delete repository"
            });
            setDeleting(false);
        }
    };

    return (
        <div className="repo-settings">
            <div className="repo-settings-section">
                <h2>General</h2>
                <form
                    className="repo-settings-form"
                    onSubmit={handleSubmit}
                >
                    <div className="repo-settings-field">
                        <label>Repository name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="repository-name"
                        />
                    </div>
                    <div className="repo-settings-field">
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Write a short description"
                            rows="4"
                        />
                    </div>
                    <div className="repo-settings-field">
                        <label>Visibility</label>
                        <select
                            name="visibility"
                            value={formData.visibility}
                            onChange={handleChange}
                        >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                        <p className="repo-settings-hint">
                            A private repository is only visible to you.
                        </p>
                    </div>
                    {message.text && (
                        <p className={`repo-settings-message ${message.type}`}>
                            {message.text}
                        </p>
                    )}
                    <button
                        type="submit"
                        className="repo-settings-save"
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </form>
            </div>

            <div className="repo-settings-section danger-zone">
                <h2>Danger Zone</h2>
                <div className="repo-danger-row">
                    <div>
                        <h3>Delete this repository</h3>
                        <p>
                            Once you delete a repository, it cannot be restored.
                            All of its issues and comments are also deleted.
                        </p>
                    </div>
                    {!confirmingDelete ? (
                        <button
                            className="repo-danger-btn"
                            onClick={() => setConfirmingDelete(true)}
                        >
                            Delete repository
                        </button>
                    ) : (
                        <div className="repo-danger-confirm">
                            <p>
                                Type <strong>{repository.name}</strong> to
                                confirm.
                            </p>
                            <input
                                type="text"
                                value={confirmName}
                                onChange={(e) =>
                                    setConfirmName(e.target.value)
                                }
                                placeholder={repository.name}
                            />
                            <div className="repo-danger-actions">
                                <button
                                    className="repo-danger-cancel"
                                    onClick={() => {
                                        setConfirmingDelete(false);
                                        setConfirmName("");
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="repo-danger-btn"
                                    onClick={handleDelete}
                                    disabled={
                                        confirmName !== repository.name ||
                                        deleting
                                    }
                                >
                                    {deleting
                                        ? "Deleting..."
                                        : "I understand, delete this repository"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RepositorySettings;
