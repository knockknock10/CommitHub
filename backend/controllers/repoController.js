import Repository from "../models/repoModel.js";

/* create repository */
export const createRepository = async (req, res) => {
    try {
        const { name, description, visibility } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Repository name is required"
            });
        }

        const existingRepo = await Repository.findOne({
            name,
            owner: req.user._id
        });

        if (existingRepo) {
            return res.status(400).json({
                message: "Repository already exists"
            });
        }

        const repository = await Repository.create({
            name,
            description,
            visibility,
            owner: req.user._id,
            branches: ["main"]
        });

        res.status(201).json(repository);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

/* get repositories */
export const getRepositories = async (req, res) => {
    try {
        const repositories = await Repository.find({
            owner: req.user._id
        }).sort({
            createdAt: -1
        });

        res.status(200).json(repositories);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};