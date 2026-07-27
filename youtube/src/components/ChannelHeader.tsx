import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Crown, Bell, BellOff } from "lucide-react";

const ChannelHeader = ({ channel, user }: any) => {
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
    <div className="w-full text-zinc-900 dark:text-zinc-100">
      {/* Banner */}
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 overflow-hidden shadow-inner"></div>

      {/* Channel Info */}
      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-white dark:border-zinc-900 shadow-md">
            <AvatarFallback className="text-2xl font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
              {channel?.channelname?.[0] || user?.name?.[0] || "C"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-4xl font-bold text-zinc-900 dark:text-white">
                {(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) || user?.name || "Channel"}
              </h1>
              {((user && user._id === channel?._id ? user?.plan : channel?.plan) === "Gold") && (
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black text-xs font-black px-3 py-1 rounded-full shadow-lg border border-amber-300 animate-pulse tracking-wide select-none">
                  <Crown className="w-4 h-4 fill-black text-black" />
                  VIP GOLD ACCOUNT
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
              <span>
                @{(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) ? ((user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname).toLowerCase().replace(/\s+/g, "")) : user?.name?.toLowerCase().replace(/\s+/g, "") || "channel"}
              </span>
            </div>
            {(user && user._id === channel?._id ? (user.description || channel?.description) : channel?.description) && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 max-w-2xl leading-relaxed">
                {(user && user._id === channel?._id ? (user.description || channel?.description) : channel?.description)}
              </p>
            )}
            
            {user && user._id === channel?._id && (
              <div className="inline-flex flex-col gap-1 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-xs text-amber-900 dark:text-amber-200 font-medium mt-2">
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-300">
                  <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>{user?.plan && user.plan !== "Free" ? `${user.plan} Member` : "Free Member"}</span>
                </div>
                {user?.subscriptionStartDate && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 font-mono">
                    Subscribed: {new Date(user.subscriptionStartDate).toLocaleDateString()} • Expires: {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : "30 Days"}
                  </p>
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
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-semibold rounded-full px-6 flex items-center gap-2"
                    : "bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-6 shadow-md"
                }
              >
                {isSubscribed ? (
                  <>
                    <Bell className="w-4 h-4 text-amber-500 fill-amber-500" /> Subscribed
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4" /> Subscribe
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
