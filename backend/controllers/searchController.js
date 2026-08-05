import Repository from "../models/repoModel.js";
import User from "../models/userModel.js";

export const globalSearch = async (req, res) => {

    try {
        const query = req.query.q?.trim() || "";

        if (query.length < 3) {
            return res.status(200).json({
                repositories: [],
                users: []
            });
        }

        const repositories = await Repository.find({
            $or: [
                {
                    name: {
                        $regex: query,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: query,
                        $options: "i",
                    },
                },
            ],
        })
            .populate("owner", "userName email")
            .select(
                "name description owner stars forks visibility createdAt"
            )
            .limit(10);

        const users = await User.find({
            $or: [
                {
                    userName: {
                        $regex: query,
                        $options: "i",
                    },
                },
                {
                    email: {
                        $regex: query,
                        $options: "i",
                    },
                },
            ],
        })
            .select(
                "userName email repositories starRepo createdAt"
            )
            .sort({
                createdAt: -1
            })
            .limit(10);

        res.status(200).json({
            repositories,
            users
        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        });
    }
};