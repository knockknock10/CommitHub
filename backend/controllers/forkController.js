import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Repository from "../models/repoModel.js";
import User from "../models/userModel.js";
import {
    authorizeRepository,
    canReadRepository
} from "../utils/repoAccess.js";
import {
    getRepoRoot,
    ensureRepoStorageDir
} from "../utils/repoStorage.js";
import { createActivity } from "../utils/activityService.js";
import {
    createNotification,
    buildNotificationMessage
} from "../utils/notificationService.js";
import { emitDomainEvent } from "../utils/domainEvents.js";
import { RT_EVENT } from "../realtime/eventTypes.js";

const copyDirectory = async (source, destination) => {
    await fs.promises.mkdir(destination, { recursive: true });
    await fs.promises.cp(source, destination, { recursive: true });
};

/* deep-copy a repository's storage (working tree + .CommitHub version
   control) into the new fork's storage root. Content-addressed commits
   and copied refs mean the fork starts from the source's exact state. */
const copyRepositoryStorage = async (sourceRoot, ownerId, repoId) => {
    await ensureRepoStorageDir(ownerId, repoId);
    await copyDirectory(sourceRoot, getRepoRoot(ownerId, repoId));
};

/* Fork the repository with `id` for the authenticated user. A user may
   fork the same repository only once (a unique owner+upstream pair). */
export const forkRepository = async (req, res) => {
    try {
        const result = await authorizeRepository(req, res, false);

        if (!result) {
            return;
        }

        const source = result.repository;

        const canFork = await canReadRepository(req.user._id, source);

        if (!canFork) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        if (source.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({
                message: "You cannot fork your own repository"
            });
        }

        const existingFork = await Repository.findOne({
            owner: req.user._id,
            upstreamRepository: source._id
        });

        if (existingFork) {
            return res.status(400).json({
                message: "You have already forked this repository"
            });
        }

        const { name, visibility } = req.body || {};

        const defaultName = source.name;

        const trimmedName =
            typeof name === "string" && name.trim() !== ""
                ? name.trim()
                : defaultName;

        if (typeof name === "string" && name.trim() === "") {
            return res.status(400).json({
                message: "Fork name cannot be empty"
            });
        }

        const trimmedVisibility = visibility === "private"
            ? "private"
            : visibility === "public"
                ? "public"
                : null;

        /* Forks of a private repository must remain private */
        const forkVisibility =
            source.visibility === "private"
                ? "private"
                : trimmedVisibility || "public";

        const nameTaken = await Repository.findOne({
            name: trimmedName,
            owner: req.user._id
        });

        if (nameTaken) {
            return res.status(400).json({
                message: `You already have a repository named "${trimmedName}"`
            });
        }

        const fork = await Repository.create({
            name: trimmedName,
            description: source.description,
            visibility: forkVisibility,
            owner: req.user._id,
            upstreamRepository: source._id,
            branches: source.branches
        });

        try {
            await copyRepositoryStorage(
                getRepoRoot(source.owner, source._id),
                req.user._id,
                fork._id
            );
        } catch (error) {
            await Repository.findByIdAndDelete(fork._id);
            return res.status(500).json({
                message: "Server error"
            });
        }

        await User.updateOne(
            { _id: req.user._id },
            { $addToSet: { repositories: fork._id } }
        );

        await Repository.updateOne(
            { _id: source._id },
            { $inc: { forks: 1 } }
        );

        await createActivity({
            actor: req.user._id,
            type: "REPOSITORY_FORKED",
            repository: fork._id,
            metadata: {
                upstreamRepository: source._id.toString(),
                upstreamName: source.name
            }
        });

        await createNotification({
            recipient: source.owner,
            actor: req.user._id,
            type: "REPOSITORY_FORKED",
            repository: source._id,
            message: buildNotificationMessage("REPOSITORY_FORKED", {
                name: source.name
            })
        });

        emitDomainEvent(RT_EVENT.REPOSITORY_FORKED, {
            repositoryId: source._id,
            forkId: fork._id,
            forkOwnerId: req.user._id,
            actor: req.user
        });

        const populated = await Repository.findById(
            fork._id
        ).populate("owner", "userName email");

        return res.status(201).json(populated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "You have already forked this repository"
            });
        }

        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* List the direct forks of the repository with `id`, newest first. Only
   forks the requester can read are returned (private forks stay visible
   only to their owner). */
export const getRepositoryForks = async (req, res) => {
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

        const canRead = await canReadRepository(req.user._id, repository);

        if (!canRead) {
            return res.status(403).json({
                message: "You do not have access to this repository"
            });
        }

        const forks = await Repository.find({
            upstreamRepository: repository._id
        })
            .populate("owner", "userName email")
            .sort({ createdAt: -1 });

        const visibleForks = [];

        for (const fork of forks) {
            const readable = await canReadRepository(req.user._id, fork);

            if (readable) {
                visibleForks.push(fork);
            }
        }

        return res.status(200).json(visibleForks);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
