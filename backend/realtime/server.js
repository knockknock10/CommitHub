import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "../models/userModel.js";
import Repository from "../models/repoModel.js";
import Collaborator from "../models/collaboratorModel.js";
import PullRequest from "../models/pullRequestModel.js";
import { RT_EVENT } from "./eventTypes.js";
import { onDomainEvent } from "../utils/domainEvents.js";

let io = null;

const ROOM = {
    user: (userId) => `user:${userId}`,
    repository: (repoId) => `repo:${repoId}`,
    pullRequest: (prId) => `pr:${prId}`
};

const emitToRoom = (room, event, payload) => {
    if (io) {
        io.to(room).emit(event, payload);
    }
};

const verifySocketAuth = async (socket) => {
    const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select(
            "-password"
        );

        if (!user) {
            return null;
        }

        return user;
    } catch {
        return null;
    }
};

const canAccessRepository = async (userId, repoId) => {
    try {
        const repo = await Repository.findById(repoId).select(
            "owner visibility"
        );

        if (!repo) {
            return false;
        }

        if (repo.owner.toString() === userId.toString()) {
            return true;
        }

        if (repo.visibility === "public") {
            return true;
        }

        const collaborator = await Collaborator.findOne({
            repository: repoId,
            user: userId
        }).lean();

        return !!collaborator;
    } catch {
        return false;
    }
};

const canAccessPullRequest = async (userId, prId) => {
    try {
        const pr = await PullRequest.findById(prId).select(
            "repository"
        );

        if (!pr) {
            return false;
        }

        return canAccessRepository(userId, pr.repository);
    } catch {
        return false;
    }
};

export const setupRealtime = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        transports: ["websocket", "polling"],
        pingInterval: 25000,
        pingTimeout: 20000
    });

    io.use(async (socket, next) => {
        const user = await verifySocketAuth(socket);

        if (!user) {
            return next(new Error("Authentication failed"));
        }

        socket.user = user;
        next();
    });

    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();

        socket.join(ROOM.user(userId));

        socket.on("join:repository", async (repoId) => {
            if (!repoId) {
                return;
            }

            const allowed = await canAccessRepository(
                userId,
                repoId
            );

            if (allowed) {
                socket.join(ROOM.repository(repoId));
            }
        });

        socket.on("leave:repository", (repoId) => {
            if (repoId) {
                socket.leave(ROOM.repository(repoId));
            }
        });

        socket.on("join:pull-request", async (prId) => {
            if (!prId) {
                return;
            }

            const allowed = await canAccessPullRequest(
                userId,
                prId
            );

            if (allowed) {
                socket.join(ROOM.pullRequest(prId));
            }
        });

        socket.on("leave:pull-request", (prId) => {
            if (prId) {
                socket.leave(ROOM.pullRequest(prId));
            }
        });
    });

    setupDomainEventListeners();

    return io;
};

export const getIO = () => io;

const setupDomainEventListeners = () => {
    onDomainEvent(
        RT_EVENT.NOTIFICATION_CREATED,
        ({ recipientId, notification }) => {
            emitToRoom(ROOM.user(recipientId), RT_EVENT.NOTIFICATION_CREATED, {
                eventId: notification._id,
                type: RT_EVENT.NOTIFICATION_CREATED,
                notification: {
                    _id: notification._id,
                    type: notification.type,
                    message: notification.message,
                    read: notification.read,
                    createdAt: notification.createdAt
                },
                createdAt: new Date().toISOString()
            });
        }
    );

    onDomainEvent(
        RT_EVENT.PR_COMMENT_CREATED,
        ({ repositoryId, pullRequestId, comment, actor }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.PR_COMMENT_CREATED,
                {
                    eventId: `${RT_EVENT.PR_COMMENT_CREATED}:${comment._id}`,
                    type: RT_EVENT.PR_COMMENT_CREATED,
                    pullRequestId,
                    repositoryId,
                    commentId: comment._id,
                    author: {
                        _id: actor._id,
                        userName: actor.userName
                    },
                    content: comment.content,
                    createdAt: comment.createdAt || new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.PR_REVIEW_CREATED,
        ({ repositoryId, pullRequestId, review, reviewState, actor }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.PR_REVIEW_CREATED,
                {
                    eventId: `${RT_EVENT.PR_REVIEW_CREATED}:${review._id}`,
                    type: RT_EVENT.PR_REVIEW_CREATED,
                    pullRequestId,
                    repositoryId,
                    reviewId: review._id,
                    state: review.state,
                    reviewState,
                    author: {
                        _id: actor._id,
                        userName: actor.userName
                    },
                    createdAt: review.createdAt || new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.PR_REVIEW_STATE_CHANGED,
        ({ repositoryId, pullRequestId, reviewState, actor }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.PR_REVIEW_STATE_CHANGED,
                {
                    eventId: `${RT_EVENT.PR_REVIEW_STATE_CHANGED}:${pullRequestId}:${Date.now()}`,
                    type: RT_EVENT.PR_REVIEW_STATE_CHANGED,
                    pullRequestId,
                    repositoryId,
                    reviewState,
                    actor: {
                        _id: actor._id,
                        userName: actor.userName
                    },
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.PR_MERGED,
        ({ repositoryId, pullRequestId, mergeCommitId, number, actor }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.PR_MERGED,
                {
                    eventId: `${RT_EVENT.PR_MERGED}:${pullRequestId}`,
                    type: RT_EVENT.PR_MERGED,
                    pullRequestId,
                    repositoryId,
                    number,
                    mergeCommitId,
                    actor: {
                        _id: actor._id,
                        userName: actor.userName
                    },
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.PR_CLOSED,
        ({ repositoryId, pullRequestId, number, actor }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.PR_CLOSED,
                {
                    eventId: `${RT_EVENT.PR_CLOSED}:${pullRequestId}`,
                    type: RT_EVENT.PR_CLOSED,
                    pullRequestId,
                    repositoryId,
                    number,
                    actor: {
                        _id: actor._id,
                        userName: actor.userName
                    },
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.PR_REOPENED,
        ({ repositoryId, pullRequestId, number, actor }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.PR_REOPENED,
                {
                    eventId: `${RT_EVENT.PR_REOPENED}:${pullRequestId}`,
                    type: RT_EVENT.PR_REOPENED,
                    pullRequestId,
                    repositoryId,
                    number,
                    actor: {
                        _id: actor._id,
                        userName: actor.userName
                    },
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.PR_CREATED,
        ({ repositoryId, pullRequestId, number, title, actor }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.PR_CREATED,
                {
                    eventId: `${RT_EVENT.PR_CREATED}:${pullRequestId}`,
                    type: RT_EVENT.PR_CREATED,
                    pullRequestId,
                    repositoryId,
                    number,
                    title,
                    actor: {
                        _id: actor._id,
                        userName: actor.userName
                    },
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.PR_MERGE_STATUS_CHANGED,
        ({ repositoryId, pullRequestId }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.PR_MERGE_STATUS_CHANGED,
                {
                    eventId: `${RT_EVENT.PR_MERGE_STATUS_CHANGED}:${pullRequestId}:${Date.now()}`,
                    type: RT_EVENT.PR_MERGE_STATUS_CHANGED,
                    pullRequestId,
                    repositoryId,
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.REVIEW_COMMENT_CREATED,
        ({ repositoryId, pullRequestId, comment, actor }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.REVIEW_COMMENT_CREATED,
                {
                    eventId: `${RT_EVENT.REVIEW_COMMENT_CREATED}:${comment._id}`,
                    type: RT_EVENT.REVIEW_COMMENT_CREATED,
                    pullRequestId,
                    repositoryId,
                    commentId: comment._id,
                    filePath: comment.filePath,
                    line: comment.line,
                    author: {
                        _id: actor._id,
                        userName: actor.userName
                    },
                    createdAt: comment.createdAt || new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.REVIEW_COMMENT_UPDATED,
        ({ repositoryId, pullRequestId, commentId }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.REVIEW_COMMENT_UPDATED,
                {
                    eventId: `${RT_EVENT.REVIEW_COMMENT_UPDATED}:${commentId}:${Date.now()}`,
                    type: RT_EVENT.REVIEW_COMMENT_UPDATED,
                    pullRequestId,
                    repositoryId,
                    commentId,
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.REVIEW_THREAD_RESOLVED,
        ({ repositoryId, pullRequestId, commentId }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.REVIEW_THREAD_RESOLVED,
                {
                    eventId: `${RT_EVENT.REVIEW_THREAD_RESOLVED}:${commentId}`,
                    type: RT_EVENT.REVIEW_THREAD_RESOLVED,
                    pullRequestId,
                    repositoryId,
                    commentId,
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.REVIEW_THREAD_UNRESOLVED,
        ({ repositoryId, pullRequestId, commentId }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.REVIEW_THREAD_UNRESOLVED,
                {
                    eventId: `${RT_EVENT.REVIEW_THREAD_UNRESOLVED}:${commentId}`,
                    type: RT_EVENT.REVIEW_THREAD_UNRESOLVED,
                    pullRequestId,
                    repositoryId,
                    commentId,
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.CI_STATUS_CHANGED,
        ({ repositoryId, pullRequestId, status, commitId }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.CI_STATUS_CHANGED,
                {
                    eventId: `${RT_EVENT.CI_STATUS_CHANGED}:${pullRequestId}:${commitId}:${status}:${Date.now()}`,
                    type: RT_EVENT.CI_STATUS_CHANGED,
                    pullRequestId,
                    repositoryId,
                    status,
                    commitId,
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.ACTIVITY_CREATED,
        ({ repositoryId, activity }) => {
            emitToRoom(
                ROOM.repository(repositoryId),
                RT_EVENT.ACTIVITY_CREATED,
                {
                    eventId: `${RT_EVENT.ACTIVITY_CREATED}:${activity._id}`,
                    type: RT_EVENT.ACTIVITY_CREATED,
                    repositoryId,
                    activityId: activity._id,
                    activityType: activity.type,
                    actor: activity.actor,
                    createdAt: activity.createdAt || new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.COLLABORATOR_ADDED,
        ({ repository, collaborator }) => {
            emitToRoom(
                ROOM.repository(repository),
                RT_EVENT.COLLABORATOR_ADDED,
                {
                    eventId: `${RT_EVENT.COLLABORATOR_ADDED}:${collaborator._id}:${Date.now()}`,
                    type: RT_EVENT.COLLABORATOR_ADDED,
                    repositoryId: repository,
                    collaborator,
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.COLLABORATOR_UPDATED,
        ({ repository, collaborator }) => {
            emitToRoom(
                ROOM.repository(repository),
                RT_EVENT.COLLABORATOR_UPDATED,
                {
                    eventId: `${RT_EVENT.COLLABORATOR_UPDATED}:${collaborator._id}:${Date.now()}`,
                    type: RT_EVENT.COLLABORATOR_UPDATED,
                    repositoryId: repository,
                    collaborator,
                    createdAt: new Date().toISOString()
                }
            );
        }
    );

    onDomainEvent(
        RT_EVENT.COLLABORATOR_REMOVED,
        ({ repository, collaborator }) => {
            emitToRoom(
                ROOM.repository(repository),
                RT_EVENT.COLLABORATOR_REMOVED,
                {
                    eventId: `${RT_EVENT.COLLABORATOR_REMOVED}:${collaborator._id}:${Date.now()}`,
                    type: RT_EVENT.COLLABORATOR_REMOVED,
                    repositoryId: repository,
                    collaborator,
                    createdAt: new Date().toISOString()
                }
            );
        }
    );
};
