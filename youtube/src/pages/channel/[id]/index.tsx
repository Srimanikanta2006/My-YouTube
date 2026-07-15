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
  const [activeTab, setActiveTab] = useState("videos");
  const [loading, setLoading] = useState(true);

  // Fetch the channel creator's videos from the database
  const fetchChannelVideos = async () => {
    if (!id) return;
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

  useEffect(() => {
    if (!router.isReady || !id) return;

    fetchChannelVideos();
  }, [id, router.isReady]);

  const getDurationInSeconds = (durationStr: string): number => {
    if (!durationStr) return 0;
    const parts = durationStr.split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    
    if (parts.length === 1) {
      return parts[0];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const getFilteredVideos = () => {
    if (activeTab === "home") {
      return videos;
    }
    if (activeTab === "videos") {
      // Regular videos: duration is empty/unset OR duration >= 60 seconds
      return videos.filter((vid) => {
        if (!vid.videoduration) return true;
        return getDurationInSeconds(vid.videoduration) >= 60;
      });
    }
    if (activeTab === "shorts") {
      // Shorts: duration is set AND duration < 60 seconds
      return videos.filter((vid) => {
        if (!vid.videoduration) return false;
        return getDurationInSeconds(vid.videoduration) < 60;
      });
    }
    return [];
  };

  const filteredVideos = getFilteredVideos();
  let channel = user;

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Only show uploader form if the logged in user is viewing their own channel */}
        {user && user._id === id && (
          <div className="px-4 pb-8">
            <VideoUploader
              channelId={id}
              channelName={channel?.channelname}
              onUploadSuccess={fetchChannelVideos}
            />
          </div>
        )}

        <div className="px-4 pb-8">
          {loading ? (
            <div className="text-gray-500 animate-pulse">Loading channel videos...</div>
          ) : activeTab === "playlists" ? (
            <div className="text-center py-12 border rounded-lg bg-gray-50 text-gray-500">
              This channel has no public playlists.
            </div>
          ) : activeTab === "community" ? (
            <div className="text-center py-12 border rounded-lg bg-gray-50 text-gray-500">
              Community posts are not available for this channel.
            </div>
          ) : activeTab === "about" ? (
            <div className="text-center py-12 border rounded-lg bg-gray-50 text-gray-500">
              {channel?.channeldescription || "No description provided for this channel."}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-gray-50 text-gray-500">
              {activeTab === "shorts" 
                ? "This channel has no uploaded Shorts." 
                : "This channel has no uploaded videos."}
            </div>
          ) : (
            <ChannelVideos 
              videos={filteredVideos} 
              title={activeTab === "home" ? "Home Uploads" : activeTab === "shorts" ? "Shorts" : "Videos"} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelDetailPage;
