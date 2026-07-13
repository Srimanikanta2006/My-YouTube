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
  }, [user]);

  const fetchSubscriptionFeed = async () => {
    try {
      const res = await axiosInstance.get("/video/getall");
      // Filter out user's own videos if they have a channel to simulate subscribing to other creators
      const feed = res.data.filter((vid: any) => vid.uploader !== user?._id);
      setVideos(feed);
    } catch (error) {
      console.error("Error fetching subscription feed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4 space-y-6">
        <PlaySquare className="w-16 h-16 text-gray-400" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-800">
            Don't miss new videos
          </h2>
          <p className="text-sm text-gray-500">
            Sign in to see updates from your favorite YouTube channels here
          </p>
        </div>
        <Button
          onClick={handlegooglesignin}
          className="flex items-center gap-2 px-6 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <User className="w-4 h-4" />
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <PlaySquare className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
      </div>

      {/* Videos Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Latest Videos</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-gray-200 rounded-lg" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-gray-50">
            <p className="text-gray-500 font-medium">No new videos from other creators yet.</p>
            <p className="text-sm text-gray-400 mt-1">Explore and check out channels on the home page!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
