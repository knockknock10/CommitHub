const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken.js");

const signup = async(req,res)=>{
    try{
        const {userName,email,password} = req.body;
        const userExit = await User.findOne({email});
        if(userExit){
            return res.status(400).json({messgae:"User already Exits"});
        }
        const hashedpwd = await bcrypt.hash(password,10);
        const user = await User.create({
            userName,
            email,
            password:hashedpwd
        })
        res.status(201).json({
            _id:user.id,
            userName:user.userName,
            email:user.email,
            password:user.password,
        });
        
        
    }catch(error){
        res.status(500).json({messgae:error.messgae});
    }
};
const login = async(req,res)=>{
    try{
        const {userName,email,password} = req.body;
        const user = await User.findOne({email});
        if(user && (await bcrypt.compare(password,user.password))){
            res.json({
                _id:user.id,
                userName:user.userName,
                email:user.email,
                token:generateToken(user._id)
            });
        }else{
            res.status(401).json({messgae:"Invalid Credentials!!"});
        }
    }catch(err){
        res.status(500).json({messgae:err.messgae});
    }
}

module.exports = {signup,login};