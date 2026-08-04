import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Crown, Bell, BellOff, Upload } from "lucide-react";
import { addNotification } from "@/lib/notificationHelper";
import axiosInstance from "@/lib/axiosinstance";
import { getBackendUrl } from "@/lib/urlHelper";

const ChannelHeader = ({
  channel,
  user,
  videoCount = 0,
  onUploadClick,
}: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  const checkSubscribed = () => {
    if (!channel) return;

    // Check DB user subscriptions first if user is logged in
    let isSub = false;
    if (user && Array.isArray(user.subscriptions)) {
      const channelId = channel._id?.toString();
      const channelName = channel.channelname;
      isSub = user.subscriptions.some((id: string) => id === channelId || id === channelName);
    }

    // Fallback check localStorage
    if (!isSub && typeof window !== "undefined") {
      const subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      isSub =
        (channel?.channelname && subscribedChannels.includes(channel.channelname)) ||
        (channel?._id && subscribedChannels.includes(channel._id));
    }

    setIsSubscribed(Boolean(isSub));

    // Initial subscriber count from MongoDB
    const baseCount = channel?.subscribers
      ? (Array.isArray(channel.subscribers) ? channel.subscribers.length : Number(channel.subscribers) || 0)
      : (channel?.subscribersCount || 0);

    setSubscriberCount(isSub ? Math.max(1, baseCount) : Math.max(0, baseCount));
  };

  useEffect(() => {
    checkSubscribed();
    const handleSubChange = () => checkSubscribed();
    window.addEventListener("subscription-changed", handleSubChange);
    window.addEventListener("storage", handleSubChange);
    return () => {
      window.removeEventListener("subscription-changed", handleSubChange);
      window.removeEventListener("storage", handleSubChange);
    };
  }, [channel, user]);

  // Real-time Cross-Device WebSocket Listener for Live Subscriber Count
  useEffect(() => {
    if (!channel) return;
    let ws: WebSocket | null = null;
    try {
      const backendUrl = getBackendUrl();
      const wsUrl = backendUrl.replace(/^http/, "ws");
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "subscribe-updated") {
            const targetId = channel._id?.toString();
            const targetName = channel.channelname;
            if (data.targetChannelId === targetId || data.targetChannelId === targetName) {
              if (typeof data.subscriberCount === "number") {
                setSubscriberCount(data.subscriberCount);
              }
            }
          }
        } catch (err) {}
      };
    } catch (err) {}

    return () => {
      if (ws) ws.close();
    };
  }, [channel]);

  const handleSubscribeToggle = async () => {
    if (!user) {
      alert("Please sign in to subscribe to channels.");
      return;
    }

    if (channel) {
      const nextSubState = !isSubscribed;
      setIsSubscribed(nextSubState);
      setSubscriberCount((prev) => (nextSubState ? prev + 1 : Math.max(0, prev - 1)));

      // Sync to localStorage
      let subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      const name = channel.channelname;
      const channelId = channel._id;

      if (nextSubState) {
        if (name && !subscribedChannels.includes(name)) subscribedChannels.push(name);
        if (channelId && !subscribedChannels.includes(channelId)) subscribedChannels.push(channelId);
      } else {
        subscribedChannels = subscribedChannels.filter((c: string) => c !== name && c !== channelId);
      }
      localStorage.setItem("subscribedChannels", JSON.stringify(subscribedChannels));
      window.dispatchEvent(new Event("subscription-changed"));

      // Send to Backend API for permanent MongoDB persistence & cross-device notification
      try {
        const res = await axiosInstance.post("/user/subscribe", {
          subscriberId: user._id,
          targetChannelId: channel._id,
          targetChannelName: channel.channelname,
        });

        if (res.data) {
          setIsSubscribed(Boolean(res.data.subscribed));
          if (typeof res.data.subscriberCount === "number") {
            setSubscriberCount(res.data.subscriberCount);
          }
        }
      } catch (err) {
        console.error("Error saving subscription:", err);
      }

      // Also trigger in-app notification dispatcher fallback
      if (nextSubState && channel._id && channel._id !== user._id) {
        addNotification({
          recipientUserId: channel._id,
          type: "subscribe",
          title: `🎉 ${user.channelname || user.name} subscribed to your channel.`,
          message: "You have a new subscriber!",
          actionUrl: `/channel/${user._id}`,
          avatar: user.image || "",
        });
      }
    }
  };

  return (
    <div className="w-full text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* 1. Asymmetric Modern Channel Cover Banner */}
      <div className="relative h-28 md:h-44 lg:h-52 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-zinc-950 border border-zinc-800/80 rounded-xl sm:rounded-3xl overflow-hidden shadow-md">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        {/* Ambient color glows */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* 2. Channel Info & Avatar Bar */}
      <div className="px-3 sm:px-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-3 sm:gap-6 relative">
          {/* Avatar: Exactly 1/4th above banner, 3/4th below */}
          <div className="relative -mt-5 md:-mt-7 flex-shrink-0 z-10">
            <Avatar className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 border-4 border-white dark:border-zinc-900 shadow-xl ring-2 ring-zinc-200/50 dark:ring-zinc-800/50">
              <AvatarImage src={channel?.image || user?.image || ""} alt={channel?.name || "Channel"} />
              <AvatarFallback className="bg-red-600 text-white font-bold text-2xl md:text-3xl">
                {(channel?.channelname || channel?.name || user?.channelname || "C")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Details & Action Controls */}
          <div className="flex-1 text-center md:text-left space-y-1.5 pt-1 sm:pt-2 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  {channel?.channelname || channel?.name || user?.channelname || "Channel Name"}
                </h1>
                
                {/* Subline metadata: @handle • count subscribers • count videos */}
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium flex-wrap mt-0.5">
                  <span>@{channel?.channelname?.toLowerCase().replace(/\s+/g, "") || "username"}</span>
                  <span>•</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {videoCount} video{videoCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Upload Button aligned to right end on larger screens */}
              {user && (user._id === channel?._id || user._id === channel?.uploader) && (
                <div className="hidden md:flex ml-auto items-center">
                  <Button
                    onClick={onUploadClick}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-6 py-2.5 shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Video</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl line-clamp-2 leading-relaxed pt-0.5 mx-auto md:mx-0">
              {channel?.description || "Welcome to the official channel. Enjoy watching all latest videos, watch parties, and high quality streams."}
            </p>

            {/* Membership badge & Action buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {channel?.plan || "Free"} Creator
              </span>

              {user && user._id !== channel?._id && (
                <Button
                  onClick={handleSubscribeToggle}
                  className={`rounded-full px-5 py-1.5 font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-1.5 shadow-md ${
                    isSubscribed
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                      : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                  }`}
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="w-4 h-4" />
                      <span>Subscribed</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Subscribe</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Mobile View: Upload Button below badge */}
            {user && (user._id === channel?._id || user._id === channel?.uploader) && (
              <div className="md:hidden pt-3 flex justify-start">
                <Button
                  onClick={onUploadClick}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-5 py-2.5 shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Video</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
