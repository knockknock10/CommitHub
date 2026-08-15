import express from "express";
import protect from "../middleware/authmiddleware.js";
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, getNotifications);

router.get("/unread-count", protect, getUnreadCount);

router.patch("/read-all", protect, markAllNotificationsRead);

router.patch("/:id/read", protect, markNotificationRead);

router.delete("/:id", protect, deleteNotification);

export default router;
