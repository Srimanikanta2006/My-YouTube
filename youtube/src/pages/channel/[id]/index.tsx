import ChannelHeader from "../../../components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";
import { X, Upload, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ChannelDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, updateUserData } = useUser();

  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("videos");
  const [loading, setLoading] = useState(true);

  // Video uploader modal trigger
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Edit Settings states for owners in "About" tab
  const [editChannelName, setEditChannelName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch the channel owner's details from backend
  const fetchChannelDetails = async () => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(`/user/get/${id}`);
      setChannel(res.data);
      setEditChannelName(res.data.channelname || "");
      setEditDescription(res.data.description || "");
    } catch (error) {
      console.error("Error fetching channel details:", error);
    }
  };

  // Fetch the channel creator's videos from the database
  const fetchChannelVideos = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get("/video/getall");
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

    setChannel(null);
    setVideos([]);
    setLoading(true);

    fetchChannelDetails();
    fetchChannelVideos();
  }, [id, router.isReady]);

  useEffect(() => {
    const handleListChange = () => {
      fetchChannelDetails();
      fetchChannelVideos();
    };
    window.addEventListener("video-list-changed", handleListChange);
    window.addEventListener("user-profile-updated", handleListChange);
    return () => {
      window.removeEventListener("video-list-changed", handleListChange);
      window.removeEventListener("user-profile-updated", handleListChange);
    };
  }, [id]);

  // Sync edit settings fields when channel changes
  useEffect(() => {
    if (channel) {
      setEditChannelName(channel.channelname || "");
      setEditDescription(channel.description || "");
    }
  }, [channel]);

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
      return videos.filter((vid) => {
        if (!vid.videoduration) return true;
        return getDurationInSeconds(vid.videoduration) >= 60;
      });
    }
    if (activeTab === "shorts") {
      return videos.filter((vid) => {
        if (!vid.videoduration) return false;
        return getDurationInSeconds(vid.videoduration) < 60;
      });
    }
    return [];
  };

  const handleSaveChannelDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChannelName.trim()) {
      alert("Channel name is required.");
      return;
    }

    try {
      setSavingSettings(true);
      const res = await axiosInstance.patch(`/user/update/${id}`, {
        channelname: editChannelName.trim(),
        description: editDescription.trim(),
      });
      
      // Update global context so navbar, sidebar, and uploads sync details instantly
      if (updateUserData) {
        updateUserData({
          channelname: res.data.channelname,
          description: res.data.description,
        });
      }

      setChannel(res.data);
      alert("Channel details saved successfully!");
    } catch (err) {
      console.error("Error saving channel settings:", err);
      alert("Failed to save channel details.");
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredVideos = getFilteredVideos();

  if (loading || !channel) {
    return (
      <div className="flex-1 min-h-screen bg-white">
        <div className="max-w-full mx-auto animate-pulse animate-duration-1000">
          {/* Banner Skeleton */}
          <div className="h-32 md:h-48 lg:h-64 bg-gray-100"></div>

          {/* Profile details Skeleton */}
          <div className="px-4 py-6 border-b">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-gray-100 flex-shrink-0"></div>
              <div className="flex-1 space-y-3 pt-2 w-full">
                <div className="h-7 bg-gray-100 rounded-md w-1/3"></div>
                <div className="h-4 bg-gray-100 rounded-md w-1/4"></div>
                <div className="h-4 bg-gray-100 rounded-md w-1/2"></div>
              </div>
            </div>
          </div>

          {/* Navigation Tab bar Skeleton */}
          <div className="border-b h-12 bg-gray-50/50 px-4 flex items-center gap-6">
            <div className="h-4 bg-gray-100 rounded w-16"></div>
            <div className="h-4 bg-gray-100 rounded w-16"></div>
            <div className="h-4 bg-gray-100 rounded w-16"></div>
            <div className="h-4 bg-gray-100 rounded w-16"></div>
          </div>

          {/* Video Grid Loader Skeleton */}
          <div className="px-4 py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-gray-100 rounded-xl w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                <div className="h-3 bg-gray-100 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        
        {/* Navigation & Action Header */}
        <div className="border-b flex flex-col md:flex-row md:items-center md:justify-between px-4 gap-2 md:gap-4 pb-2 md:pb-0">
          <div className="w-full md:max-w-3xl overflow-x-auto scrollbar-none">
            <Channeltabs activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
          {/* Render video uploader button ONLY on user's own channel */}
          {user && user._id === id && (
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs px-4 h-9 shadow flex items-center gap-1.5 self-end md:self-auto mb-2 md:mb-0 flex-shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Video
            </Button>
          )}
        </div>

        <div className="px-4 py-8">
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
            /* About Tab Content */
            user && user._id === id ? (
              /* If owner: Edit channel settings form */
              <form onSubmit={handleSaveChannelDetails} className="max-w-2xl border rounded-2xl p-6 bg-white shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-800 border-b pb-3 mb-2">
                  <Settings className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-base">Channel Customization</h3>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="channelName">Channel Name</Label>
                  <Input
                    id="channelName"
                    value={editChannelName}
                    onChange={(e) => setEditChannelName(e.target.value)}
                    placeholder="Enter channel display name"
                    className="border-gray-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="channelDesc">Description (About)</Label>
                  <textarea
                    id="channelDesc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Tell viewers about your channel, content schedule, and social links"
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-red-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl text-xs shadow"
                >
                  {savingSettings ? "Saving..." : "Save Details"}
                </Button>
              </form>
            ) : (
              /* If guest: Show static description */
              <div className="border rounded-2xl p-6 bg-gray-50 text-gray-700 max-w-3xl leading-relaxed text-sm">
                <h3 className="font-bold text-gray-900 mb-3 text-base">About Channel</h3>
                <p>{channel?.description || "No description provided for this channel."}</p>
              </div>
            )
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

      {/* Video Uploader Modal Overlay */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150 border">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 p-1.5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <VideoUploader
              onUploadSuccess={() => {
                setIsUploadOpen(false);
                fetchChannelVideos();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelDetailPage;
