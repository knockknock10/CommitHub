import User from "../models/userModel.js";

export const getUserProfile = async(req,res)=>{

    try{

        const user = await User.findById(
            req.params.id
        )
        .populate("repositories")
        .populate("starRepo");

        if(!user){

            return res.status(404).json({
                message:"User not found"
            });
        }

        res.status(200).json(user);

    }catch(err){

        res.status(500).json({
            message:err.message
        });
    }
};