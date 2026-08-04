import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Crown, Bell, BellOff, Upload } from "lucide-react";

const ChannelHeader = ({ channel, user, onUploadClick }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const channelKey = channel?.channelname || channel?._id;

  const checkSubscribed = () => {
    if (typeof window !== "undefined" && channel) {
      const subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      const isSub =
        (channel?.channelname && subscribedChannels.includes(channel.channelname)) ||
        (channel?._id && subscribedChannels.includes(channel._id));
      setIsSubscribed(Boolean(isSub));
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
      let subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      const name = channel.channelname;
      const channelId = channel._id;

      const isSub =
        (name && subscribedChannels.includes(name)) ||
        (channelId && subscribedChannels.includes(channelId));

      if (isSub) {
        subscribedChannels = subscribedChannels.filter(
          (c: string) => c !== name && c !== channelId
        );
        setIsSubscribed(false);
      } else {
        if (name && !subscribedChannels.includes(name)) subscribedChannels.push(name);
        if (channelId && !subscribedChannels.includes(channelId)) subscribedChannels.push(channelId);
        setIsSubscribed(true);
      }

      localStorage.setItem("subscribedChannels", JSON.stringify(subscribedChannels));
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

      {/* 2. Raised Profile Info section with Overlapping Avatar */}
      <div className="px-1 sm:px-2 pt-0 pb-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-start">
          {/* Overlapping Avatar */}
          <Avatar className="w-16 h-16 md:w-24 md:h-24 -mt-8 md:-mt-12 border-4 border-white dark:border-zinc-950 shadow-md flex-shrink-0 z-10 transition-colors duration-300">
            <AvatarFallback className="text-xl md:text-2xl font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors duration-300">
              {channel?.channelname?.[0] || user?.name?.[0] || "C"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1.5 min-w-0 pt-1">
            {/* Title + Upload Button */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight transition-colors duration-300">
                {(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) || user?.name || "Channel"}
              </h1>
              {user && user._id === channel?._id && onUploadClick && (
                <Button
                  onClick={onUploadClick}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-3.5 py-1 text-xs h-8 flex items-center gap-1.5 shadow-sm transition-transform hover:scale-105 cursor-pointer ml-1"
                >
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span>Upload Video</span>
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 font-medium transition-colors duration-300">
              <span>
                @{(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) ? ((user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname).toLowerCase().replace(/\s+/g, "")) : user?.name?.toLowerCase().replace(/\s+/g, "") || "channel"}
              </span>
            </div>

            {(user && user._id === channel?._id ? (user.description || channel?.description) : channel?.description) && (
              <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 max-w-2xl leading-relaxed transition-colors duration-300">
                {(user && user._id === channel?._id ? (user.description || channel?.description) : channel?.description)}
              </p>
            )}
            
            {/* Compact Membership Card */}
            {user && user._id === channel?._id && (
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium mt-1 transition-colors duration-300">
                <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>{user?.plan && user.plan !== "Free" ? `${user.plan} Member` : "Free Member"}</span>
                {user?.subscriptionStartDate && (
                  <span className="text-[11px] text-amber-800 dark:text-amber-400 font-mono border-l border-amber-500/20 pl-2 ml-1">
                    Expires: {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : "30 Days"}
                  </span>
                )}
              </div>
            )}
          </div>

          {user && user?._id !== channel?._id && (
            <div className="flex gap-2">
              <Button
                onClick={handleSubscribeToggle}
                className={
                  isSubscribed
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-semibold rounded-full px-5 h-9 text-xs flex items-center gap-1.5 transition-colors duration-300"
                    : "bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-5 h-9 text-xs shadow-md transition-colors duration-300"
                }
              >
                {isSubscribed ? (
                  <>
                    <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Subscribed
                  </>
                ) : (
                  <>
                    <BellOff className="w-3.5 h-3.5" /> Subscribe
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
