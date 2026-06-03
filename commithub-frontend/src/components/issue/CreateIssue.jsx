import { useState } from "react";
import { createIssue } from "../../api/issueApi";
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

                <input
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

                <textarea
                    placeholder="Issue description"
                    value={description}
                    onChange={(e) =>
                        setDescription(
                            e.target.value
                        )
                    }
                    required
                />

                <select
                    value={label}
                    onChange={(e) =>
                        setLabel(
                            e.target.value
                        )
                    }
                >

                    <option value="bug">
                        Bug
                    </option>

                    <option value="enhancement">
                        Enhancement
                    </option>

                    <option value="documentation">
                        Documentation
                    </option>

                    <option value="question">
                        Question
                    </option>

                </select>

                {error && (
                    <p>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                >
                    {
                        loading
                        ? "Creating..."
                        : "Create Issue"
                    }
                </button>

            </form>

        </div>
    );
};

export default CreateIssue;