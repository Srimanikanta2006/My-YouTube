import express from "express";
import {
  getNotifications,
  createNotification,
  markAllAsRead,
  markOneAsRead,
} from "../Controllers/notification.js";

const router = express.Router();

router.get("/:userId", getNotifications);
router.post("/create", createNotification);
router.patch("/read-all/:userId", markAllAsRead);
router.patch("/read/:id", markOneAsRead);

export default router;
