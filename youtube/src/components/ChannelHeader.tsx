import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Crown, Bell, BellOff, Upload } from "lucide-react";
import { addNotification } from "@/lib/notificationHelper";

const ChannelHeader = ({
  channel,
  user,
  videoCount = 0,
  onUploadClick,
}: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const channelKey = channel?.channelname || channel?._id;

  const [subscriberCount, setSubscriberCount] = useState(0);

  const checkSubscribed = () => {
    if (typeof window !== "undefined" && channel) {
      const subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      const isSub =
        (channel?.channelname && subscribedChannels.includes(channel.channelname)) ||
        (channel?._id && subscribedChannels.includes(channel._id));
      setIsSubscribed(Boolean(isSub));

      const baseCount = channel?.subscribersCount || (channel?.subscribers && Array.isArray(channel.subscribers) ? channel.subscribers.length : 0);
      setSubscriberCount(isSub ? Math.max(1, baseCount) : Math.max(0, baseCount));
    }
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
  }, [channel]);

  const handleSubscribeToggle = () => {
    if (!user) {
      alert("Please sign in to subscribe to channels.");
      return;
    }

    if (typeof window !== "undefined" && channel) {
      let subscribedChannels = JSON.parse(
        localStorage.getItem("subscribedChannels") || "[]",
      );
      const name = channel.channelname;
      const channelId = channel._id;

      const isSub =
        (name && subscribedChannels.includes(name)) ||
        (channelId && subscribedChannels.includes(channelId));

      if (isSub) {
        subscribedChannels = subscribedChannels.filter(
          (c: string) => c !== name && c !== channelId,
        );
        setIsSubscribed(false);
        setSubscriberCount((prev) => Math.max(0, prev - 1));
      } else {
        if (name && !subscribedChannels.includes(name))
          subscribedChannels.push(name);
        if (channelId && !subscribedChannels.includes(channelId))
          subscribedChannels.push(channelId);
        setIsSubscribed(true);
        setSubscriberCount((prev) => prev + 1);

        if (channel._id && channel._id !== user._id) {
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

      localStorage.setItem(
        "subscribedChannels",
        JSON.stringify(subscribedChannels),
      );
      window.dispatchEvent(new Event("subscription-changed"));
    }
  };

  return (
    <div className="w-full text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* 1. Asymmetric Modern Channel Cover Banner */}
      <div className="relative h-28 md:h-44 lg:h-52 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-zinc-950 border border-zinc-800/80 rounded-xl sm:rounded-3xl overflow-hidden shadow-md">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        {/* Ambient color glows */}
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-16 left-1/3 w-96 h-96 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
      </div>
      {/* 2. Raised Profile Info section with 1/4th Overlapping Avatar */}
      <div className="px-1 sm:px-2 pt-0 pb-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start justify-between">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start flex-1 min-w-0">
            {/* Overlapping Avatar: 1/4th part above banner, 3/4th part below banner */}
            <Avatar className="w-20 h-20 md:w-28 md:h-28 -mt-5 md:-mt-7 border-4 border-white dark:border-zinc-950 shadow-lg flex-shrink-0 z-10 transition-colors duration-300">
              <AvatarImage src={(user && user._id === channel?._id ? user.image : channel?.image) || ""} />
              <AvatarFallback className="text-2xl md:text-3xl font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors duration-300">
                {(channel?.channelname || user?.channelname || user?.name)?.[0]?.toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2 min-w-0 pt-1">
              {/* Channel Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight transition-colors duration-300">
                {(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) || user?.name || "Channel"}
              </h1>

              {/* Username + Dot + Subscribers + Dot + Video Count */}
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 font-medium transition-colors duration-300">
                <span>
                  @{(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) ? ((user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname).toLowerCase().replace(/\s+/g, "")) : user?.name?.toLowerCase().replace(/\s+/g, "") || "channel"}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">•</span>
                <span>{subscriberCount} {subscriberCount === 1 ? "subscriber" : "subscribers"}</span>
                <span className="text-zinc-400 dark:text-zinc-500">•</span>
                <span>{videoCount} {videoCount === 1 ? "video" : "videos"}</span>
              </div>

              {/* Description */}
              {(user && user._id === channel?._id ? (user.description || channel?.description) : channel?.description) && (
                <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 max-w-2xl leading-relaxed transition-colors duration-300 pt-0.5">
                  {(user && user._id === channel?._id ? (user.description || channel?.description) : channel?.description)}
                </p>
              )}
              
              {/* Membership Badge */}
              {user && user._id === channel?._id && (
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium mt-1 transition-colors duration-300">
                  <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>{user?.plan && user.plan !== "Free" ? `${user.plan} Member` : "Free Member"}</span>
                  {user?.subscriptionStartDate && (
                    <span className="text-[11px] text-amber-800 dark:text-amber-400 font-mono border-l border-amber-500/20 pl-2 ml-1">
                      Expires: {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : "30 Days"}
                    </span>
                  )}
                </div>
              )}

              {/* Mobile View: Upload Video Button placed below badge on left */}
              {user && user._id === channel?._id && onUploadClick && (
                <div className="pt-2 md:hidden">
                  <Button
                    onClick={onUploadClick}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-5 py-2 text-xs h-9 flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-white" />
                    <span>Upload Video</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop View: Upload Video Button (Owner) or Subscribe Button (Visitor) in Right Corner */}
          <div className="mt-2 md:mt-3 shrink-0 self-start md:self-auto ml-auto">
            {user && user._id === channel?._id && onUploadClick ? (
              <Button
                onClick={onUploadClick}
                className="hidden md:flex bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-5 py-2 text-xs sm:text-sm h-10 items-center gap-2 shadow-md transition-transform hover:scale-105 cursor-pointer ml-auto"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>Upload Video</span>
              </Button>
            ) : user && user?._id !== channel?._id ? (
              <Button
                onClick={handleSubscribeToggle}
                className={
                  isSubscribed
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-bold rounded-full px-6 h-10 text-xs sm:text-sm flex items-center gap-2 transition-colors duration-300"
                    : "bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-6 h-10 text-xs sm:text-sm shadow-md transition-colors duration-300"
                }
              >
                {isSubscribed ? (
                  <>
                    <Bell className="w-4 h-4 text-amber-500 fill-amber-500" />{" "}
                    Subscribed
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4" /> Subscribe
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
