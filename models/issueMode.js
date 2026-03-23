const mongoose = require("mongoose");
const {Schema} = mongoose;

const IssueSchema = Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    status:{
        type:String,
        enum:["open","close"],
        default:"open",  
    },
    Repository:{
        type:Schema.Types.ObjectId,
        ref:"Repository",
        required:true,
    },
})

const Issue = mongoose.model("Issue",IssueSchema);
module.exports = Issue;