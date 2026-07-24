import React, { useEffect, useState } from "react";
import { PlaySquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoCard from "@/components/Videocard";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

export default function SubscriptionsPage() {
  const { user, handlegooglesignin } = useUser();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscriptionFeed();
    } else {
      setLoading(false);
    }

    const handleListChange = () => {
      if (user) fetchSubscriptionFeed();
    };
    window.addEventListener("video-list-changed", handleListChange);
    return () => window.removeEventListener("video-list-changed", handleListChange);
  }, [user]);

  const fetchSubscriptionFeed = async () => {
    try {
      const res = await axiosInstance.get("/video/getall");
      
      // Load subscribed channels from localStorage
      let subscribedChannels: string[] = [];
      if (typeof window !== "undefined") {
        subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      }
      
      // Filter videos to only show uploads from channels the user has subscribed to
      const feed = res.data.filter((vid: any) => 
        subscribedChannels.includes(vid.videochanel)
      );
      setVideos(feed);
    } catch (error) {
      console.error("Error fetching subscription feed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4 space-y-6 text-zinc-900 dark:text-zinc-100">
        <PlaySquare className="w-16 h-16 text-zinc-400 dark:text-zinc-500" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Don't miss new videos
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to see updates from your favorite YouTube channels here
          </p>
        </div>
        <Button
          onClick={handlegooglesignin}
          className="flex items-center gap-2 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full cursor-pointer"
        >
          <User className="w-4 h-4" />
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-8 text-zinc-900 dark:text-zinc-100">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-zinc-800 pb-4">
        <PlaySquare className="w-8 h-8 text-red-600 dark:text-red-500" />
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Subscriptions</h1>
      </div>

      {/* Videos Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Latest Videos</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">No new videos from other creators yet.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Explore and check out channels on the home page!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
