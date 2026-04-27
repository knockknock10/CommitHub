const  jwt = require('jsonwebtoken');
const User = require("../models/userModel");

const protec = async(req,res,next)=>{
    let token;
    if(req.headers.authorozation && req.headers.authorozation.startsWith('Bearer')){
        try{
            token=req.headers.authorozation.split(" ")[1];
            const decod = jwt.verify(token,process.env.JWT_SECRET);
            req.user = await User.findById(decod.id).select("-password");
            next();  
        }catch(err){
            res.status(401).json({
                message:"Not Authorized!!"
            })
        }
    }else{
        res.status(401).json({message:"No Token"})
    }
}
module.exports = protec;