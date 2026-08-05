import Notification from "../Modals/notification.js";
import user from "../Modals/auth.js";

// Helper function to broadcast any WebSocket event to all connected clients
export const broadcastWebSocketMessage = (req, messageData) => {
  try {
    const wss = req?.app?.get("wss");
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(messageData));
        }
      });
    }
  } catch (err) {
    console.error("Error broadcasting WebSocket message:", err);
  }
};

// Helper function to create and push a notification to a specific recipient user
export const sendTargetedNotification = async (req, notifData) => {
  try {
    const { recipientUserId, type, title, message, actionUrl, senderName, senderImage } = notifData;
    if (!recipientUserId || !title) return null;

    const newNotif = new Notification({
      recipientUserId,
      type: type || "system",
      title,
      message: message || "",
      actionUrl: actionUrl || "#",
      read: false,
      senderName: senderName || "",
      senderImage: senderImage || "",
    });

    await newNotif.save();

    // Broadcast targeted notification event to online WebSockets
    broadcastWebSocketMessage(req, {
      type: "new-notification",
      recipientUserId: notifData.recipientUserId,
      notification: newNotif,
    });

    return newNotif;
  } catch (err) {
    console.error("Error creating targeted notification:", err);
    return null;
  }
};

// 1. Get all notifications for logged in user (newest first)
export const getNotifications = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "User ID parameter required." });
  }
  try {
    const notifications = await Notification.find({ recipientUserId: userId })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Error fetching notifications." });
  }
};

// 2. API Endpoint to Create Notification
export const createNotification = async (req, res) => {
  try {
    const notif = await sendTargetedNotification(req, req.body);
    if (!notif) {
      return res.status(400).json({ message: "Failed to create notification." });
    }
    return res.status(201).json(notif);
  } catch (error) {
    return res.status(500).json({ message: "Server error creating notification." });
  }
};

// 3. Mark all notifications for user as read
export const markAllAsRead = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "User ID parameter required." });
  }
  try {
    await Notification.updateMany(
      { recipientUserId: userId, read: false },
      { $set: { read: true } }
    );
    return res.status(200).json({ success: true, message: "Marked all as read." });
  } catch (error) {
    return res.status(500).json({ message: "Error updating read status." });
  }
};

// 4. Mark single notification as read
export const markOneAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await Notification.findByIdAndUpdate(
      id,
      { $set: { read: true } },
      { new: true }
    );
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Error updating notification." });
  }
};
