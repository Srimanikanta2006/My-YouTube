import React, { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Crown } from "lucide-react";

const ChannelHeader = ({ channel, user }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
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
            <h1 className="text-2xl md:text-4xl font-bold text-zinc-900 dark:text-white">
              {(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) || user?.name || "Channel"}
            </h1>
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
            
            {user && (
              <div className="inline-flex flex-col gap-1 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl text-xs text-amber-900 dark:text-amber-200 font-medium mt-2">
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-300">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Current Membership Plan: {user?.plan || "Free"} {user?.plan && user.plan !== "Free" ? "⭐" : ""}</span>
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
                onClick={() => setIsSubscribed(!isSubscribed)}
                className={
                  isSubscribed
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 font-medium rounded-full"
                    : "bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full"
                }
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
