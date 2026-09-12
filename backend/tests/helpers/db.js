import mongoose from "mongoose";

/* Connect to the per-file isolated test database. Each test file derives a
   unique database name from the shared MONGO_URI so suites never collide on
   the production `commithub` database. */

export const connectTestDB = async (mongoUri) => {
    await mongoose.connect(mongoUri);
};

export const dropDatabase = async () => {
    if (mongoose.connection && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
    }
};

export const disconnectTestDB = async () => {
    await mongoose.disconnect();
};

export const clearCollections = async (modelList) => {
    await Promise.all(modelList.map((model) => model.deleteMany({})));
};
