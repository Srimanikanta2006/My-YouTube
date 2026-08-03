"use client";

export interface NotificationPayload {
  id?: string;
  recipientUserId?: string; // Intended recipient user ID or "all"
  type:
    | "UPLOAD"
    | "SUBSCRIBE"
    | "COMMENT"
    | "REPLY"
    | "WATCH_PARTY"
    | "DOWNLOAD"
    | "UPLOAD_COMPLETE"
    | "PAYMENT"
    | "MEMBERSHIP"
    | "EXPIRING"
    | "upload"
    | "subscribe"
    | "comment"
    | "reply"
    | "watch_party"
    | "download"
    | "payment"
    | "expiring";
  title: string;
  message: string;
  avatar?: string;
  actionUrl?: string;
  createdAt?: string;
  isRead?: boolean;
}

export function addNotification(payload: NotificationPayload) {
  if (typeof window === "undefined") return;

  const newNotif = {
    id: payload.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    recipientUserId: payload.recipientUserId || "all",
    type: payload.type,
    title: payload.title,
    message: payload.message,
    avatar: payload.avatar || "",
    actionUrl: payload.actionUrl || "/",
    createdAt: payload.createdAt || new Date().toISOString(),
    isRead: false,
  };

  try {
    const existingStr = localStorage.getItem("myyoutube_notifications");
    const existing: NotificationPayload[] = existingStr ? JSON.parse(existingStr) : [];

    // Prevent exact duplicate notifications within 2 seconds
    if (existing.length > 0 && existing[0].title === newNotif.title && existing[0].message === newNotif.message) {
      return;
    }

    const updated = [newNotif, ...existing];
    localStorage.setItem("myyoutube_notifications", JSON.stringify(updated));

    // Dispatch global custom event for instant UI update without refresh
    window.dispatchEvent(
      new CustomEvent("myyoutube-new-notification", {
        detail: newNotif,
      })
    );
  } catch (e) {
    console.error("Error saving notification:", e);
  }
}
