import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/lib/axiosinstance";
import WatchPartyPanel from "@/components/WatchPartyPanel";
import { Compass, Sparkles, Video, Plus, Users, Tv, ArrowLeft, LogIn } from "lucide-react";

export default function WatchPartyPortal() {
  const { user, handlegooglesignin } = useUser();
  const router = useRouter();
  const room = router.query.room as string | undefined;

  const [videosList, setVideosList] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [joinCode, setJoinCode] = useState("");
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // 1. Fetch available videos from database to choose from inside the watch party
  useEffect(() => {
    if (!user) return;
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setVideosList(res.data);
        if (res.data.length > 0) {
          setSelectedVideo(res.data[0]); // Default to first video
        }
      } catch (err) {
        console.error("Error loading watch party videos list:", err);
      } finally {
        setLoadingVideos(false);
      }
    };
    fetchVideos();
  }, [user]);

  const handleCreateRoom = () => {
    const code = "WP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/watch-party?room=${code}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      let code = joinCode.trim();
      if (code.includes("room=")) {
        const parts = code.split("room=");
        code = parts[parts.length - 1];
      }
      router.push(`/watch-party?room=${code}`);
    }
  };

  const handleLeaveRoom = () => {
    router.push("/watch-party");
  };

  const handleForceSync = () => {
    if (videoElement) {
      const panelWs = (window as any).partyWs;
      if (panelWs && panelWs.readyState === 1) {
        panelWs.send(JSON.stringify({
          type: "video-control",
          action: "seek",
          time: videoElement.currentTime
        }));
      }
    }
  };

  const videoCallbackRef = (node: HTMLVideoElement | null) => {
    if (node) {
      setVideoElement(node);
    }
  };

  // 2. Unauthenticated User View
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] max-w-md mx-auto text-center px-4 space-y-6">
        <div className="p-4 bg-red-50 rounded-full text-red-600 animate-bounce">
          <Tv className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Watch Party Portal
          </h1>
          <p className="text-gray-500">
            Create private theater rooms, start video calls, chat, and stream videos in perfect sync with your friends.
          </p>
        </div>
        <Button
          onClick={handlegooglesignin}
          className="flex items-center gap-2 px-6 py-5 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google to Enter
        </Button>
      </div>
    );
  }

  // 3. Dashboard View (Create or Join room)
  if (!room) {
    return (
      <div className="max-w-[1200px] mx-auto p-6 md:p-12 space-y-12">
        {/* Banner */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
            <Tv className="w-96 h-96" />
          </div>
          <div className="max-w-xl space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3 h-3" /> New Dedicated Theater Portal
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
              Stream Together, Synchronized.
            </h1>
            <p className="text-red-100 font-medium">
              Create a room, share the invite URL with friends, and enjoy real-time synced videos with integrated WebRTC video calling and chat!
            </p>
          </div>
        </div>

        {/* Action panels grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Room */}
          <div className="border rounded-2xl p-8 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Start a New Watch Party</h2>
              <p className="text-sm text-gray-500">
                Launch a fresh room instantly. You'll be generated an invite code to share with your friends.
              </p>
            </div>
            <Button
              onClick={handleCreateRoom}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 rounded-xl shadow"
            >
              Create Room
            </Button>
          </div>

          {/* Join Room */}
          <div className="border rounded-2xl p-8 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Join an Existing Party</h2>
              <p className="text-sm text-gray-500">
                Enter an invite code or room link provided by your host to join the theater group.
              </p>
            </div>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <Input
                type="text"
                placeholder="Enter invite code or URL (e.g. WP-ABCDEF)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="py-6 rounded-xl border-gray-300"
                required
              />
              <Button
                type="submit"
                className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-6 rounded-xl"
              >
                Join Room
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 4. Active Room Theater View
  return (
    <div className="max-w-[1700px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Room navigation header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLeaveRoom}
            className="rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              Theater Room: <span className="text-red-600">{room}</span>
            </h1>
            <p className="text-xs text-gray-500">Host session active • Real-time video sync enabled</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Section: Video Stage & Selector */}
        <div className="flex-1 lg:max-w-[70%] space-y-6">
          {/* Video Selector Dropdown */}
          <div className="bg-gray-50 p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Select Video to Stream Together
              </label>
              {loadingVideos ? (
                <span className="text-sm text-gray-500 animate-pulse">Loading videos catalog...</span>
              ) : (
                <select
                  value={selectedVideo?._id || ""}
                  onChange={(e) => {
                    const videoId = e.target.value;
                    const video = videosList.find(v => v._id === videoId);
                    if (video) {
                      setSelectedVideo(video);
                      // Let signaling broadcast the video switch event to other room peers
                      const panelWs = (window as any).partyWs;
                      if (panelWs && panelWs.readyState === 1) {
                        panelWs.send(JSON.stringify({
                          type: "select-video",
                          videoId: videoId
                        }));
                      }
                    }
                  }}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-red-500 min-w-[280px] max-w-[400px] shadow-sm cursor-pointer"
                >
                  {videosList.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.videotitle} ({v.videochanel})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedVideo && (
              <div className="text-right hidden sm:block">
                <span className="text-xs text-gray-500 font-semibold block">Channel Uploader</span>
                <span className="text-sm text-gray-700 font-bold">{selectedVideo.videochanel}</span>
              </div>
            )}
          </div>

          {/* Active Video Player Stage */}
          {selectedVideo ? (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
                <video
                  ref={videoCallbackRef}
                  src={
                    selectedVideo.filepath.startsWith("http")
                      ? selectedVideo.filepath
                      : `${(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "")}/${selectedVideo.filepath.replace(/\\/g, "/").replace(/^\//, "")}`
                  }
                  className="w-full h-full"
                  controls
                  preload="metadata"
                />
              </div>
              <div className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedVideo.videotitle}</h2>
                    <p className="text-sm text-gray-600">Channel: <span className="font-semibold text-gray-800">{selectedVideo.videochanel}</span></p>
                  </div>
                  <Button
                    onClick={handleForceSync}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    Sync Room
                  </Button>
                </div>
                <div className="w-full h-px bg-gray-100" />
                <p className="text-xs text-gray-400">
                  You are watching this video together. Local player actions (Play, Pause, Seeks) synchronize instantly to other peers in the room. Use the "Sync Room" button if anyone lags behind.
                </p>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center text-gray-400 flex-col space-y-2 border">
              <Tv className="w-12 h-12 text-gray-600 animate-pulse" />
              <p className="font-medium">No video loaded</p>
              <p className="text-xs text-gray-500">Please choose a video from the catalog dropdown above.</p>
            </div>
          )}
        </div>

        {/* Right Section: Watch Party Call, Chat & Members Panel */}
        <div className="w-full lg:w-[30%]">
          <WatchPartyPanel 
            roomId={room} 
            videoElement={videoElement} 
            onLeave={handleLeaveRoom}
            videosList={videosList}
            onSelectVideo={(video) => setSelectedVideo(video)}
          />
        </div>
      </div>
    </div>
  );
}
