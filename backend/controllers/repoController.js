import mongoose from "mongoose";
import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import Issue from "../models/issueMode.js";
import Comment from "../models/commentModel.js";

/* star repository */
export const starRepository = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner.toString() === req.user._id.toString();

        if (repository.visibility === "private" && !isOwner) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        // raw collection update: mongoose injects updatedAt via timestamps,
        // which would make modifiedCount 1 even when nothing changed
        const result = await User.collection.updateOne(
            { _id: req.user._id },
            { $addToSet: { starRepo: repository._id } }
        );

        if (result.modifiedCount === 1) {
            await Repository.updateOne(
                { _id: repository._id },
                { $inc: { stars: 1 } }
            );
        }

        res.status(200).json({
            stars: result.modifiedCount === 1
                ? repository.stars + 1
                : repository.stars,
            isStarred: true
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

/* unstar repository */
export const unstarRepository = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const result = await User.collection.updateOne(
            { _id: req.user._id },
            { $pull: { starRepo: repository._id } }
        );

        if (result.modifiedCount === 1) {
            await Repository.updateOne(
                { _id: repository._id },
                { $inc: { stars: -1 } }
            );
        }

        res.status(200).json({
            stars: result.modifiedCount === 1
                ? Math.max(0, repository.stars - 1)
                : repository.stars,
            isStarred: false
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}
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
// export const getRepositories = async (req, res) => {
//     try {
//         const repositories = await Repository.find({
//             owner: req.user._id
//         }).sort({
//             createdAt: -1
//         });

//         res.status(200).json(repositories);
//     } catch (error) {
//         res.status(500).json({
//             message: error.message
//         });
//     }
// };
export const getRepositories = async (req, res) => {
    try {
        console.log("===== getRepositories CALLED =====");
        console.log("req.user =", req.user);

        const repositories = await Repository.find({
            owner: req.user._id
        });

        console.log("repositories =", repositories);

        return res.status(200).json(repositories);

    } catch (error) {
        console.error("getRepositories ERROR:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};
//fetch repo by id
export const getRepositoryById = async (req,res) => {
    try{
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id)
            .populate("owner", "userName email");

        if(!repository){
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner &&
            repository.owner._id.toString() === req.user._id.toString();

        const isStarred = req.user.starRepo
            .some((repoId) =>
                repoId.toString() === repository._id.toString()
            );

        if (repository.visibility === "public" || isOwner) {
            return res.status(200).json({
                ...repository.toObject(),
                isStarred,
                isOwner
            });
        }

        return res.status(403).json({
            message: "You do not have access to this repository"
        });
    }catch(error){
        return res.status(500).json({
            message: "Server error"
        });
    }
}

/* update repository */
export const updateRepository = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner.toString() === req.user._id.toString();

        if (!isOwner) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        const { name, description, visibility } = req.body;

        const updates = {};

        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                return res.status(400).json({
                    message: "Repository name must be a non-empty string"
                });
            }

            const nameTaken = await Repository.findOne({
                name,
                owner: req.user._id,
                _id: { $ne: repository._id }
            });

            if (nameTaken) {
                return res.status(400).json({
                    message: "Repository already exists"
                });
            }

            updates.name = name;
        }

        if (description !== undefined) {
            if (typeof description !== "string") {
                return res.status(400).json({
                    message: "Description must be a string"
                });
            }

            updates.description = description;
        }

        if (visibility !== undefined) {
            if (visibility !== "public" && visibility !== "private") {
                return res.status(400).json({
                    message: "Visibility must be public or private"
                });
            }

            updates.visibility = visibility;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No valid fields to update"
            });
        }

        repository.set(updates);

        await repository.save();

        await repository.populate("owner", "userName email");

        return res.status(200).json(repository);
    }catch(error){
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* delete repository */
export const deleteRepository = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid repository ID"
            });
        }

        const repository = await Repository.findById(id);

        if (!repository) {
            return res.status(404).json({
                message: "Repository not found"
            });
        }

        const isOwner =
            repository.owner.toString() === req.user._id.toString();

        if (!isOwner) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        const issues = await Issue.find({
            repository: repository._id
        });

        const issueIds = issues.map((issue) => issue._id);

        await Comment.deleteMany({
            issue: { $in: issueIds }
        });

        await Issue.deleteMany({
            repository: repository._id
        });

        await User.updateMany({}, {
            $pull: {
                starRepo: repository._id,
                repositories: repository._id
            }
        });

        await Repository.findByIdAndDelete(repository._id);

        return res.status(200).json({
            message: "Repository deleted"
        });
    }catch(error){
        return res.status(500).json({
            message: "Server error"
        });
    }
};