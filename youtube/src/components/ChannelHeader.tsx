import React, { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Crown } from "lucide-react";

const ChannelHeader = ({ channel, user }: any) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  return (
    <div className="w-full">
      {/* Banner */}
      <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden"></div>

      {/* Channel Info */}
      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Avatar className="w-20 h-20 md:w-32 md:h-32">
            <AvatarFallback className="text-2xl">
              {channel?.channelname?.[0] || user?.name?.[0] || "C"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold">
              {(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) || user?.name || "Channel"}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>
                @{(user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname) ? ((user && user._id === channel?._id ? (user.channelname || channel?.channelname) : channel?.channelname).toLowerCase().replace(/\s+/g, "")) : user?.name?.toLowerCase().replace(/\s+/g, "") || "channel"}
              </span>
            </div>
            {(user && user._id === channel?._id ? (user.description || channel?.description) : channel?.description) && (
              <p className="text-sm text-gray-700 max-w-2xl">
                {(user && user._id === channel?._id ? (user.description || channel?.description) : channel?.description)}
              </p>
            )}
            
            {user && (
              <div className="inline-flex flex-col gap-1 bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl text-xs text-amber-900 font-medium mt-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>Current Membership Plan: {user?.plan || "Free"} {user?.plan && user.plan !== "Free" ? "⭐" : ""}</span>
                </div>
                {user?.subscriptionStartDate && (
                  <p className="text-[11px] text-amber-800 font-mono">
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
                variant={isSubscribed ? "outline" : "default"}
                className={
                  isSubscribed ? "bg-gray-100" : "bg-red-600 hover:bg-red-700"
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
