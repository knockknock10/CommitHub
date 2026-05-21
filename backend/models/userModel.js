import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(

    {

        userName: {

            type: String,

            required: true,

            unique: true
        },

        email: {

            type: String,

            required: true,

            unique: true
        },

        password: {

            type: String,

            required: true
        },

        repositories: [

            {

                type: mongoose.Schema.Types.ObjectId,

                ref: "Repository"
            }
        ],

        followedUsers: [

            {

                type: mongoose.Schema.Types.ObjectId,

                ref: "User"
            }
        ],

        starRepo: [

            {

                type: mongoose.Schema.Types.ObjectId,

                ref: "Repository"
            }
        ]
    },

    {

        timestamps: true
    }
);

const User = mongoose.model(
    "User",
    UserSchema
);

export default User;