"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Sparkles,
  MessageSquare,
  UserPlus,
  Video,
  Download,
  CreditCard,
  BellOff,
  Flame,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import { getWsUrl } from "../lib/urlHelper";
import { useUser } from "@/lib/AuthContext";

export interface NotificationItem {
  id: string;
  type: "comment" | "reply" | "subscribe" | "upload" | "download" | "watch_party" | "payment" | "expiring";
  title: string;
  message: string;
  avatar?: string;
  actionUrl?: string;
  createdAt: string;
  isRead: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

export default function NotificationBell() {
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [badgeAnimating, setBadgeAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved notifications from localStorage or initialize empty
  useEffect(() => {
    try {
      const saved = localStorage.getItem("myyoutube_notifications");
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }
  }, []);

  // Custom Event Listener for real-time instant notifications across app without refresh
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationItem>;
      if (customEvent.detail) {
        const item = customEvent.detail;
        setNotifications((prev) => {
          if (prev.some((n) => n.id === item.id)) return prev;
          const updated = [item, ...prev];
          try {
            localStorage.setItem("myyoutube_notifications", JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setBadgeAnimating(true);
        setTimeout(() => setBadgeAnimating(false), 400);
      }
    };

    window.addEventListener("myyoutube-new-notification", handleNewNotification);
    return () => window.removeEventListener("myyoutube-new-notification", handleNewNotification);
  }, []);

  // Save to localStorage when notifications update
  const updateNotificationsState = (newList: NotificationItem[]) => {
    setNotifications(newList);
    try {
      localStorage.setItem("myyoutube_notifications", JSON.stringify(newList));
    } catch {
      // Ignore storage quota errors
    }
  };

  // Real-time WebSocket connection to receive instant notifications
  useEffect(() => {
    const wsUrl = getWsUrl();
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "global-video-uploaded") {
              const newNotif: NotificationItem = {
                id: `notif-${Date.now()}`,
                type: "upload",
                title: "🎬 Your upload is ready.",
                message: `"${data.title || "Video"}" uploaded successfully.`,
                actionUrl: data.videoId ? `/watch/${data.videoId}` : "/",
                createdAt: new Date().toISOString(),
                isRead: false,
              };

              setNotifications((prev) => {
                const updated = [newNotif, ...prev];
                try {
                  localStorage.setItem("myyoutube_notifications", JSON.stringify(updated));
                } catch {}
                return updated;
              });

              setBadgeAnimating(true);
              setTimeout(() => setBadgeAnimating(false), 400);
            }
          } catch {
            // Ignore format errors
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 5000);
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        // Fallback silently if WS disabled
      }
    };

    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const userNotifications = notifications.filter((n: any) => {
    if (!user) return n.recipientUserId === "all" || !n.recipientUserId;
    return (
      n.recipientUserId === "all" ||
      !n.recipientUserId ||
      n.recipientUserId === user._id ||
      n.recipientUserId === user.channelname ||
      n.recipientUserId === user.email
    );
  });

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    // Clear unread badge on panel open
    if (nextState && unreadCount > 0) {
      const readList = notifications.map((n) => ({ ...n, isRead: true }));
      updateNotificationsState(readList);
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const readList = notifications.map((n) => ({ ...n, isRead: true }));
    updateNotificationsState(readList);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNotificationsState([]);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setIsOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  // Format relative time helper
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  const getIconForType = (type: NotificationItem["type"]) => {
    switch (type) {
      case "comment":
      case "reply":
        return <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "subscribe":
        return <UserPlus className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "upload":
        return <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case "download":
        return <Download className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "watch_party":
        return <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case "payment":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "expiring":
        return <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Bell Button with Dynamic Unread Badge (Exact Original Styling) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleOpen}
        className="relative rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />

        {/* Dynamic Unread Badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-4 px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full border-2 border-white dark:border-zinc-900 shadow-md transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              badgeAnimating ? "scale-140" : "scale-100"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Floating Dropdown Panel Anchored Under Bell */}
      {isOpen && (
        <div className="absolute right-0 sm:-right-2 top-full mt-2 w-80 sm:w-96 max-h-[480px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl z-50 overflow-hidden origin-top-right animate-in fade-in-50 zoom-in-95 duration-200 flex flex-col font-sans text-zinc-900 dark:text-zinc-100">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-600 dark:text-red-500" />
              <h3 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                Notifications
              </h3>
              {userNotifications.length > 0 && (
                <span className="text-[11px] font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                  {userNotifications.length}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
          </div>

          {/* Scrollable Notification List */}
          <div className="overflow-y-auto max-h-[380px] divide-y divide-zinc-100 dark:divide-zinc-800/60 scrollbar-none">
            {userNotifications.length === 0 ? (
              /* Empty State */
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                  <BellOff className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    You're all caught up!
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[200px]">
                    No new notifications right now. Check back later for video updates & activity.
                  </p>
                </div>
              </div>
            ) : (
              userNotifications.map((notif: any) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 p-3.5 cursor-pointer transition-all ${
                    !notif.isRead
                      ? "bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-blue-600 dark:border-blue-500"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  {/* Action Type Icon Avatar */}
                  <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 shrink-0 shadow-xs mt-0.5 border border-zinc-200/50 dark:border-zinc-700/50">
                    {getIconForType(notif.type)}
                  </div>

                  {/* Message & Title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-medium">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 line-clamp-2 leading-snug">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread Indicator Dot */}
                  {!notif.isRead && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Options */}
          {userNotifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
              <button
                onClick={handleClearAll}
                className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear all
              </button>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                My YouTube Notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
