import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";
import Repository from "./models/repoModel.js";
import Issue from "./models/issueMode.js";

dotenv.config();
/* connect database */
await connectDB();

const seedData = async () => {
    try{
        /* clear old data */
        await User.deleteMany();
        await Repository.deleteMany();
        await Issue.deleteMany();
        console.log("Old data removed");
        /* hash password */
        const hashedPassword =
        await bcrypt.hash(
            "123456",
            10
        );
        /* create demo user */
        const createdUser =
        await User.create({
            userName: "sanjeevkumar",
            email:"sanjeev@gmail.com",
            password:hashedPassword
        });
        console.log(
            "Demo user created"
        );
        /* create repositories */
        const repositories = await Repository.insertMany([
            {   
                name:"CommitHub",
                description:"GitHub inspired version control platform.",
                visibility:"public",
                owner:createdUser._id,
                stars: 14,
                forks: 3,
                branches: [
                    "main",
                    "development"
                ]
            }, 
            {
                name:"aws-storage-service",
                description:"Handles AWS S3 uploads and repository backups.",
                visibility:"private",
                owner:createdUser._id,
                stars: 8,
                forks: 1,
                branches: [
                    "main"
                ]
            },
            {
                name:"commithub-frontend",
                description:"Frontend dashboard and repository interface for CommitHub.",
                visibility:"public",
                owner:createdUser._id,
                stars: 21,
                forks: 7,
                branches: [
                    "main",
                    "feature/ui-refresh"
                ]
            }
        ]);
        console.log(
            "Repositories initiated"
        );
        /* create issues */
        await Issue.insertMany([
            {
                title:"Fix responsive dashboard sidebar",
                description:"Sidebar overlaps content on smaller screen sizes.",
                status:"open",
                repository:repositories[0]._id,
                label:"bug",
                author:createdUser._id
            },
            {
                title:"Add pull request filters",
                description:"Need open, closed, and merged pull request filters.",
                status:"open",
                repository:repositories[2]._id,
                label:"enhancement",
                author:createdUser._id
            },
            {
                title:"Improve AWS upload validation",
                description:"Validate unsupported file formats before upload.",
                status:"closed",
                repository:repositories[1]._id,
                label:"documentation",
                author:createdUser._id
            }
        ]);
        console.log(
            "Issues Initiated"
        );
        console.log(
            "Database Initiated successfully"
        );
        process.exit();
    }catch(error){
        console.error("database intitalization  error:",error.message);
        process.exit(1);
    }
};

seedData();