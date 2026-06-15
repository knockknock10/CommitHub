import Comment from "../models/commentModel.js";
import Issue from "../models/issueMode.js";

export const createComment = async (req,res) => {

    try {

        const issue = await Issue.findById(
            req.params.issueId
        );

        if(!issue){
            return res.status(404).json({
                message:"Issue not found"
            });
        }

        const { content } = req.body;

        const comment = await Comment.create({
            content,
            author:req.user._id,
            issue:issue._id
        });

        const populatedComment =
            await Comment.findById(comment._id)
            .populate(
                "author",
                "userName email"
            );

        res.status(201).json(
            populatedComment
        );

    } catch(err){

        res.status(500).json({
            message:err.message
        });
    }
};

export const getIssueComments = async (req,res) => {

    try {

        const comments =
            await Comment.find({
                issue:req.params.issueId
            })
            .populate(
                "author",
                "userName email"
            )
            .sort({
                createdAt:1
            });

        res.status(200).json(
            comments
        );

    } catch(err){

        res.status(500).json({
            message:err.message
        });
    }
};

export const deleteComment = async (req,res) => {

    try {

        const comment =
            await Comment.findById(
                req.params.commentId
            );

        if(!comment){
            return res.status(404).json({
                message:"Comment not found"
            });
        }

        if(
            comment.author.toString()
            !==
            req.user._id.toString()
        ){
            return res.status(403).json({
                message:"Not authorized"
            });
        }

        await comment.deleteOne();

        res.status(200).json({
            message:"Comment deleted"
        });

    } catch(err){

        res.status(500).json({
            message:err.message
        });
    }
};