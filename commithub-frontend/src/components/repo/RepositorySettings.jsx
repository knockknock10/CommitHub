import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    deleteRepository,
    updateRepository
} from "../../api/repositoryApi";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import Modal from "../ui/Modal";

const DESCRIPTION_MAX = 500;

const VISIBILITY_OPTIONS = [
    { value: "public", label: "Public" },
    { value: "private", label: "Private" }
];

const VISIBILITY_HINTS = {
    public: "Anyone can view this repository.",
    private: "Only you and authorized users can view this repository."
};

const RepositorySettings = ({ repository, canDelete = false, onUpdated }) => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: repository.name,
        description: repository.description || "",
        visibility: repository.visibility || "public"
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmName, setConfirmName] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const descriptionLength = formData.description.length;

    const dirty =
        (formData.name || "").trim() !== (repository.name || "") ||
        (formData.description || "") !== (repository.description || "") ||
        (formData.visibility || "public") !==
            (repository.visibility || "public");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: "" }));
        }
        if (message.text) {
            setMessage({ type: "", text: "" });
        }
    };

    const handleReset = () => {
        setFormData({
            name: repository.name,
            description: repository.description || "",
            visibility: repository.visibility || "public"
        });
        setFieldErrors({});
        setMessage({ type: "", text: "" });
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.name || !formData.name.trim()) {
            errors.name = "Repository name is required.";
        }

        if (descriptionLength > DESCRIPTION_MAX) {
            errors.description = `Description is too long (max ${DESCRIPTION_MAX} characters).`;
        }

        return errors;
    };

    const applyBackendErrors = (rawMessage) => {
        const FIELD_MESSAGES = {
            "Repository name must be a non-empty string":
                "Repository name is required.",
            "Repository already exists":
                "Repository name already exists.",
            "Description must be a string":
                "Description must be valid text.",
            "Visibility must be public or private":
                "Visibility must be Public or Private."
        };

        const mapped = FIELD_MESSAGES[rawMessage];

        if (mapped) {
            const key = rawMessage.startsWith("Repository")
                ? "name"
                : rawMessage.startsWith("Description")
                ? "description"
                : "visibility";
            setFieldErrors({ [key]: mapped });
            return true;
        }

        return false;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: "", text: "" });

        const errors = validateForm();
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setSaving(true);

        try {
            const updated = await updateRepository(repository._id, {
                name: formData.name.trim(),
                description: formData.description || "",
                visibility: formData.visibility
            });
            onUpdated(updated);
            setFormData({
                name: updated.name,
                description: updated.description || "",
                visibility: updated.visibility
            });
            setFieldErrors({});
            setMessage({
                type: "success",
                text: "Repository updated successfully."
            });
        } catch (error) {
            const rawMessage =
                error.response?.data?.message || "";
            if (!applyBackendErrors(rawMessage)) {
                setMessage({
                    type: "error",
                    text: rawMessage || "Failed to update repository."
                });
            }
        } finally {
            setSaving(false);
        }
    };

    const closeConfirm = () => {
        if (deleting) return;
        setConfirmOpen(false);
        setConfirmName("");
        setDeleteError("");
    };

    const handleDelete = async () => {
        if (confirmName !== repository.name) {
            return;
        }

        setDeleteError("");
        setDeleting(true);

        try {
            await deleteRepository(repository._id);
            navigate("/dashboard");
        } catch (error) {
            setDeleteError(
                error.response?.data?.message ||
                    "Failed to delete repository."
            );
            setDeleting(false);
        }
    };

    return (
        <div className="repo-settings">
            <section className="repo-settings-card">
                <header className="repo-settings-card-header">
                    <h2>General settings</h2>
                    <p>
                        Manage the name, description and visibility of this
                        repository.
                    </p>
                </header>

                <form
                    className="repo-settings-form"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <div className="repo-settings-field repo-settings-field--name">
                        <Input
                            id="repo-settings-name"
                            label="Repository name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="repository-name"
                            error={fieldErrors.name}
                            autoComplete="off"
                            spellCheck="false"
                        />
                        <p className="repo-settings-note">
                            Names must be unique within your account.
                        </p>
                    </div>

                    <div className="repo-settings-field">
                        <Textarea
                            id="repo-settings-description"
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Short description of this repository"
                            rows={4}
                            error={fieldErrors.description}
                        />
                        <p className="repo-settings-note">
                            {descriptionLength} / {DESCRIPTION_MAX} characters
                        </p>
                    </div>

                    <div className="repo-settings-field">
                        <Select
                            id="repo-settings-visibility"
                            label="Visibility"
                            name="visibility"
                            value={formData.visibility}
                            onChange={handleChange}
                            options={VISIBILITY_OPTIONS}
                            error={fieldErrors.visibility}
                        />
                        <p className="repo-settings-note">
                            {VISIBILITY_HINTS[formData.visibility] ||
                                ""}
                        </p>
                    </div>

                    {message.text && (
                        <div
                            role="status"
                            className={`repo-settings-message repo-settings-message--${message.type}`}
                        >
                            {message.text}
                        </div>
                    )}

                    <div className="repo-settings-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleReset}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={saving}
                            disabled={!dirty}
                        >
                            Save changes
                        </Button>
                    </div>
                </form>
            </section>

            {canDelete && (
                <section className="repo-settings-card repo-settings-card--danger">
                    <header className="repo-settings-card-header">
                        <h2>Danger Zone</h2>
                        <p>
                            Destructive actions that permanently remove data.
                        </p>
                    </header>
                    <div className="repo-danger-row">
                        <div className="repo-danger-text">
                            <h3>Delete this repository</h3>
                            <p>
                                Once you delete a repository, it cannot be
                                restored. All of its issues and comments are
                                also deleted.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={() => setConfirmOpen(true)}
                        >
                            Delete repository
                        </Button>
                    </div>
                </section>
            )}

            <Modal
                isOpen={confirmOpen}
                onClose={closeConfirm}
                title={`Delete ${repository.name}?`}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeConfirm}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleDelete}
                            loading={deleting}
                            disabled={confirmName !== repository.name}
                        >
                            I understand, delete this repository
                        </Button>
                    </>
                }
            >
                <div className="repo-delete-confirm">
                    <p>
                        This action <strong>cannot be undone</strong>. The
                        repository, its issues, comments and history will be
                        permanently deleted.
                    </p>

                    <label
                        htmlFor="repo-delete-confirm-name"
                        className="repo-delete-confirm-label"
                    >
                        Type <strong>{repository.name}</strong> to confirm.
                    </label>
                    <Input
                        id="repo-delete-confirm-name"
                        type="text"
                        value={confirmName}
                        onChange={(e) => {
                            setConfirmName(e.target.value);
                            if (deleteError) setDeleteError("");
                        }}
                        placeholder={repository.name}
                        error={deleteError}
                        autoComplete="off"
                        spellCheck="false"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default RepositorySettings;