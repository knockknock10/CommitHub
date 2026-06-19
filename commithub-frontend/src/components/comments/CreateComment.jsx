import { useState } from "react";
import { createComment } from "../../api/commentApi";

const CreateComment = ({
    issueId,
    onCommentCreated
}) => {

    const [content,setContent] =
        useState("");

    const handleSubmit = async(e)=>{

        e.preventDefault();

        if(!content.trim()) return;

        try{

            await createComment(
                issueId,
                {content}
            );

            setContent("");

            onCommentCreated();

        }catch(err){

            console.log(err);
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
                onChange={(e)=>
                    setContent(
                        e.target.value
                    )
                }
            />

            <button type="submit">
                Add Comment
            </button>

        </form>
    );
};

export default CreateComment;