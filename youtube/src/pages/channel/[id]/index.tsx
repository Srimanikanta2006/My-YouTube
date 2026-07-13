import ChannelHeader from "../../../components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";

const ChannelDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch the channel creator's videos from the database
  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchChannelVideos = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/video/getall");
        // Filter videos by the uploader's channel ID
        const channelVids = res.data.filter((vid: any) => vid.uploader === id);
        setVideos(channelVids);
      } catch (error) {
        console.error("Error fetching channel videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannelVideos();
  }, [id, router.isReady]);

  let channel = user;

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs />
        
        {/* Only show uploader form if the logged in user is viewing their own channel */}
        {user && user._id === id && (
          <div className="px-4 pb-8">
            <VideoUploader channelId={id} channelName={channel?.channelname} />
          </div>
        )}

        <div className="px-4 pb-8">
          {loading ? (
            <div className="text-gray-500 animate-pulse">Loading channel videos...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-gray-50 text-gray-500">
              This channel has no uploaded videos yet.
            </div>
          ) : (
            <ChannelVideos videos={videos} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelDetailPage;
