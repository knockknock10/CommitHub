import express from "express";
import cors from "cors"
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import repositoryRoutes from "./routes/repositoryRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import userRoutes from "./routes/userRoutes.js";


dotenv.config();

const app = express();

/* middleware */

app.use(express.json());

app.use(cors());

/* routes */

app.use("/api/auth", authRoutes);

app.use("/api/repositories",repositoryRoutes);
app.use("/api/issues",issueRoutes);

app.use("/api/comments",commentRoutes);
app.use("/api/users",userRoutes);

app.get("/", (req, res) => {
    res.send("CommitHub API running");
});


const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try{
        await connectDB();
        app.listen(PORT, () => {
            console.log(
                `Server running on port ${PORT}`
            );
        });
    }catch(error){
        console.error(error);
    }
};

startServer();