import dotenv from "dotenv";

dotenv.config();

const config = {
    port: Number(process.env.PORT) || 5001,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
};

export default config;
