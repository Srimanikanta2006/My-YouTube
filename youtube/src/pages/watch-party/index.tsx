import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/lib/axiosinstance";
import WatchPartyPanel from "@/components/WatchPartyPanel";
import { Sparkles, Plus, Users, Tv, ArrowLeft, LogIn } from "lucide-react";

export default function WatchPartyPortal() {
  const { user, handlegooglesignin } = useUser();
  const router = useRouter();
  const room = router.query.room as string | undefined;

  const [videosList, setVideosList] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  // 1. Fetch available videos from database to choose from inside the watch party
  useEffect(() => {
    if (!user) return;
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setVideosList(res.data);
      } catch (err) {
        console.error("Error loading watch party videos list:", err);
      }
    };
    fetchVideos();
  }, [user]);

  const handleCreateRoom = () => {
    // Generate room code and push to portal
    const code = "WP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/watch-party?room=${code}&create=true`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    let code = joinCode.trim();
    if (!code) return;

    // Extract code if user pasted a full URL containing '?room=WP-XXXXXX'
    if (code.includes("room=")) {
      const parts = code.split("room=");
      code = parts[parts.length - 1];
      if (code.includes("&")) {
        code = code.split("&")[0];
      }
    }

    // Validate code pattern (e.g. WP-XXXXXX or XXXXXX where X is 6 chars of uppercase alphanumeric)
    const codePattern = /^(?:WP-)?[A-Z0-9]{6}$/i;
    if (!codePattern.test(code)) {
      setJoinError("Please enter a valid room code (e.g., WP-ABCDEF) or paste the invite link.");
      return;
    }

    // Standardize code to start with WP-
    let finalCode = code.toUpperCase();
    if (!finalCode.startsWith("WP-")) {
      finalCode = "WP-" + finalCode;
    }

    router.push(`/watch-party?room=${finalCode}`);
  };

  const handleLeaveRoom = () => {
    router.push("/watch-party");
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
          className="flex items-center gap-2 px-6 py-5 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
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
      <div className="max-w-[1200px] mx-auto p-6 md:p-12 space-y-12 animate-in fade-in duration-200">
        {/* Banner */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
            <Tv className="w-96 h-96" />
          </div>
          <div className="max-w-xl space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-yellow-300" /> New Dedicated Theater Portal
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
          <div className="border border-gray-150 rounded-2xl p-8 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
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
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 rounded-xl shadow cursor-pointer transition-colors"
            >
              Create Room
            </Button>
          </div>

          {/* Join Room */}
          <div className="border border-gray-150 rounded-2xl p-8 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
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
                onChange={(e) => {
                  setJoinCode(e.target.value);
                  setJoinError("");
                }}
                className="py-6 rounded-xl border-gray-300"
                required
              />
              {joinError && (
                <p className="text-xs text-red-500 font-semibold px-1">{joinError}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-6 rounded-xl cursor-pointer transition-colors"
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
    <WatchPartyPanel 
      roomId={room} 
      onLeave={handleLeaveRoom}
      videosList={videosList}
      createMode={router.query.create === "true"}
    />
  );
}
