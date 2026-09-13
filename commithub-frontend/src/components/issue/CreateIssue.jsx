import { useState } from "react";
import { createIssue } from "../../api/issueApi";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import "../../styles/issue.css";

const CreateIssue = ({
    repositoryId,
    onIssueCreated
}) => {

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [label, setLabel] = useState("bug");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setLoading(true);
            setError("");

            await createIssue(
                repositoryId,
                {
                    title,
                    description,
                    label
                }
            );

            setTitle("");
            setDescription("");
            setLabel("bug");

            onIssueCreated();

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Failed to create issue"
            );

        } finally {

            setLoading(false);
        }
    };

    return (

        <div className="create-issue-card">

            <h2>Create Issue</h2>

            <form onSubmit={handleSubmit}>

                <Input
                    label="Title"
                    type="text"
                    placeholder="Issue title"
                    value={title}
                    onChange={(e) =>
                        setTitle(
                            e.target.value
                        )
                    }
                    required
                />

                <Textarea
                    label="Description"
                    placeholder="Issue description"
                    value={description}
                    onChange={(e) =>
                        setDescription(
                            e.target.value
                        )
                    }
                    required
                />

                <Select
                    label="Label"
                    value={label}
                    onChange={(e) =>
                        setLabel(
                            e.target.value
                        )
                    }
                    options={[
                        { value: "bug", label: "Bug" },
                        { value: "enhancement", label: "Enhancement" },
                        { value: "documentation", label: "Documentation" },
                        { value: "question", label: "Question" },
                    ]}
                />

                {error && (
                    <p className="ui-input-error">
                        {error}
                    </p>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    loading={loading}
                    variant="primary"
                >
                    {
                        loading
                        ? "Creating..."
                        : "Create Issue"
                    }
                </Button>

            </form>

        </div>
    );
};

export default CreateIssue;