require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("CommitHub API running ");
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await connectDB();
});