import { useEffect,useState } from "react";
import {
    getComments
} from "../../api/commentApi";

import CommentCard from "./CommentCard";
import CreateComment from "./CreateComment";

const CommentList = ({ issueId }) => {

    const [comments,setComments] =
        useState([]);

    const [reload,setReload] =
        useState(false);

    useEffect(()=>{

        const loadComments =
        async()=>{

            try{

                const data =
                await getComments(
                    issueId
                );

                setComments(data);

            }catch(err){

                console.log(err);
            }
        };

        loadComments();

    },[issueId,reload]);

    return(
        <div>

            <h2>
                Comments
            </h2>

            <CreateComment
                issueId={issueId}
                onCommentCreated={()=>
                    setReload(
                        prev=>!prev
                    )
                }
            />

            {
                comments.map(
                    (comment)=>(
                        <CommentCard
                            key={
                                comment._id
                            }
                            comment={
                                comment
                            }
                        />
                    )
                )
            }

        </div>
    );
};

export default CommentList;