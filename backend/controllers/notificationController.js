import mongoose from "mongoose";
import Notification from "../models/notificationModel.js";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
};

/* list notifications for the authenticated user */
export const getNotifications = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(
            parsePositiveInt(req.query.limit, DEFAULT_LIMIT),
            MAX_LIMIT
        );

        const query = {
            recipient: req.user._id
        };

        if (req.query.unread === "true") {
            query.read = false;
        }

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .populate("actor", "userName email")
                .populate("issue", "title")
                .populate("pullRequest", "number title")
                .populate("release", "title tagName")
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Notification.countDocuments(query)
        ]);

        return res.status(200).json({
            notifications,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* unread notification count for the authenticated user */
export const getUnreadCount = async (req, res) => {
    try {
        const unread = await Notification.countDocuments({
            recipient: req.user._id,
            read: false
        });

        return res.status(200).json({ unread });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* mark a single notification as read */
export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

        const notification = await Notification.findOne({
            _id: id,
            recipient: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        if (!notification.read) {
            notification.read = true;
            await notification.save();
        }

        return res.status(200).json(notification);
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* mark all notifications of the authenticated user as read */
export const markAllNotificationsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { $set: { read: true } }
        );

        return res.status(200).json({
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};

/* delete a notification owned by the authenticated user.
   Deleting a notification never affects the underlying event. */
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

        const notification = await Notification.findOne({
            _id: id,
            recipient: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        await notification.deleteOne();

        return res.status(200).json({
            message: "Notification deleted"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error"
        });
    }
};
