import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        /*
         * Ensure organization-scoped repository names are unique.
         *
         * The old implementation attempted to create this index without
         * first removing an existing index with the same generated name.
         * MongoDB therefore reported an index-name conflict.
         */
        try {
            const collection = conn.connection.db.collection("repositories");

            const indexes = await collection.indexes();

            const existingIndex = indexes.find(
                index => index.name === "organization_1_name_1"
            );

            if (existingIndex) {
                const hasCorrectFilter =
                    existingIndex.unique === true &&
                    existingIndex.partialFilterExpression?.organization?.$type ===
                    "objectId";

                if (!hasCorrectFilter) {
                    console.log(
                        "Removing outdated repositories.organization_1_name_1 index..."
                    );

                    await collection.dropIndex("organization_1_name_1");

                    console.log("Outdated repository index removed.");
                }
            }

            await collection.createIndex(
                { organization: 1, name: 1 },
                {
                    name: "organization_1_name_1",
                    unique: true,
                    partialFilterExpression: {
                        organization: { $type: "objectId" }
                    }
                }
            );

            console.log("Repository organization/name index verified.");
        } catch (indexError) {
            console.error(`Index creation warning: ${indexError.message}`);
        }
    } catch (error) {
        console.error(`MongoDB Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
