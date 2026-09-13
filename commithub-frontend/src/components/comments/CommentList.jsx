import { useEffect, useState } from "react";
import { getComments, deleteComment } from "../../api/commentApi";

import CommentCard from "./CommentCard";
import CreateComment from "./CreateComment";

const CommentList = ({ issueId }) => {

    const [comments, setComments] = useState([]);
    const [reload, setReload] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadComments = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getComments(issueId);
            setComments(data);
        } catch {
            setError("Failed to load comments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        loadComments();

    }, [issueId, reload]);

    const handleDelete = async (commentId) => {
        try {
            await deleteComment(commentId);
            setReload((prev) => !prev);
        } catch {
            setError("Failed to delete comment.");
        }
    };

    return (
        <div>

            <h2>
                Comments
            </h2>

            <CreateComment
                issueId={issueId}
                onCommentCreated={() =>
                    setReload((prev) => !prev)
                }
            />

            {loading ? (
                <div className="shared-loading">
                    <p>Loading comments...</p>
                </div>
            ) : error ? (
                <div className="shared-error">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="state-btn"
                        onClick={loadComments}
                    >
                        Retry
                    </button>
                </div>
            ) : comments.length === 0 ? (
                <div className="shared-empty-state">
                    <p>No comments yet. Start the conversation!</p>
                </div>
            ) : (
                comments.map((comment) => (
                    <CommentCard
                        key={comment._id}
                        comment={comment}
                        onDelete={handleDelete}
                    />
                ))
            )}

        </div>
    );
};

export default CommentList;
