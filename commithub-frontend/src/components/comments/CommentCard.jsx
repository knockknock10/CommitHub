const CommentCard = ({ comment }) => {

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

            </div>

            <p>
                {comment.content}
            </p>

        </div>
    );
};

export default CommentCard;