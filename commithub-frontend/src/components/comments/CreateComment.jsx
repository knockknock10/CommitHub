import { useState } from "react";
import { createComment } from "../../api/commentApi";

const CreateComment = ({
    issueId,
    onCommentCreated
}) => {

    const [content,setContent] =
        useState("");

    const [submitting,setSubmitting] =
        useState(false);

    const [error,setError] =
        useState("");

    const handleSubmit = async(e)=>{

        e.preventDefault();

        if(!content.trim() || submitting) return;

        setSubmitting(true);
        setError("");

        try{

            await createComment(
                issueId,
                {content}
            );

            setContent("");

            onCommentCreated();

        } catch {
            setError("Couldn't add comment. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return(
        <form
            className="comment-form"
            onSubmit={handleSubmit}
        >

            <textarea
                placeholder="Write a comment..."
                value={content}
                disabled={submitting}
                onChange={(e)=>
                    setContent(
                        e.target.value
                    )
                }
            />

            <button type="submit" disabled={submitting}>
                {submitting ? "Posting..." : "Add Comment"}
            </button>

            {error && <p className="comment-error">{error}</p>}

        </form>
    );
};

export default CreateComment;