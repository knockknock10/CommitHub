const mongoose = require('mongoose');
const { required } = require('yargs');

const UserSchema = mongoose.Schema(
    {
        userName: {
            type: String,
            required: true,
            unique:true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        repositories:[{
            default:[],
            type:mongoose.Schema.Types.ObjectId,//will point to repo and act as a link
            ref:"Repository",
        }],
        
        followedUsers:[
        {
            default:[],
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
        }],
        starRepo:[
        {
            default:[],
            type:mongoose.Schema.Types.ObjectId,
            ref:"Repository",
        }],
    }, { timestamps: true }
);
const User = mongoose.model("User",UserSchema);

module.exports = User;
