import mongoose from "mongoose";
import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import { getUserRepositoryRole } from "../services/permissionService.js";

const filterVisibleRepos = async (ids, viewerId) => {
    const visible = [];

    for (const id of ids) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            continue;
        }

        const repo = await Repository.findById(id)
            .select("name visibility owner stars")
            .lean();

        if (!repo) {
            continue;
        }

        if (repo.visibility === "public") {
            visible.push(repo);
            continue;
        }

        const role = await getUserRepositoryRole(viewerId, repo._id);

        if (role) {
            visible.push(repo);
        }
    }

    return visible;
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(
            req.params.id
        )
            .select("-password")
            .lean();

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const repositoryIds = user.repositories || [];
        const starredIds = user.starRepo || [];

        user.repositories = await filterVisibleRepos(
            repositoryIds,
            req.user._id
        );

        user.starRepo = await filterVisibleRepos(
            starredIds,
            req.user._id
        );

        user.followers = await User.countDocuments({
            followedUsers: user._id
        });

        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({
            message: "Server error"
        });
    }
};