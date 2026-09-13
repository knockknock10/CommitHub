import { useAuth } from "../../context/AuthContext";

const CommentCard = ({ comment, onDelete }) => {

    const { user } = useAuth();
    const isAuthor = user?._id === comment.author?._id;

    return (
        <div className="comment-card">

            <div className="comment-header">

                <strong>
                    {comment.author?.userName}
                </strong>

                <span>
                    {new Date(
                        comment.createdAt
                    ).toLocaleDateString()}
                </span>

                {isAuthor && onDelete && (
                    <button
                        className="comment-delete-btn"
                        onClick={() => onDelete(comment._id)}
                    >
                        Delete
                    </button>
                )}

            </div>

            <p>
                {comment.content}
            </p>

        </div>
    );
};

export default CommentCard;
