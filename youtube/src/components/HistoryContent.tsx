"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock } from "lucide-react";
import { getBackendUrl } from "../lib/urlHelper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

export default function HistoryContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setLoading(true);
    }
    const handleListChange = () => {
      if (user) loadHistory();
    };
    window.addEventListener("video-list-changed", handleListChange);
    return () => window.removeEventListener("video-list-changed", handleListChange);
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      const historyData = await axiosInstance.get(`/history/${user?._id}`);
      const validItems = (historyData.data || []).filter((item: any) => item && item.videoid);
      setHistory(validItems);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 text-zinc-900 dark:text-zinc-100">
        <Clock className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
        <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">
          Keep track of what you watch
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Watch history isn't viewable when signed out.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 text-zinc-500 dark:text-zinc-400 animate-pulse">Loading history...</div>;
  }

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await axiosInstance.delete(`/history/delete/${historyId}`);
      setHistory(history.filter((item) => item._id !== historyId));
    } catch (error) {
      console.error("Error removing from history:", error);
    }
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-900 dark:text-zinc-100">
        <Clock className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
        <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">No watch history yet</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Videos you watch will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100 max-w-5xl">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold">Watch History</h1>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{history.length} videos</p>
      </div>

      <div className="space-y-4">
        {history.map((item) => (
          <VideoRowItem
            key={item._id}
            item={item}
            onRemove={() => handleRemoveFromHistory(item._id)}
          />
        ))}
      </div>
    </div>
  );
}

function VideoRowItem({ item, onRemove }: { item: any; onRemove: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const backendUrl = getBackendUrl();
  const normalizedPath = item.videoid?.filepath ? item.videoid.filepath.replace(/\\/g, "/") : "";
  const videoSrcBase = normalizedPath.startsWith("http") ? normalizedPath : `${backendUrl}/${normalizedPath}`;
  let videoSrc = videoSrcBase ? `${videoSrcBase}#t=0.1` : "";
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    videoSrc = videoSrc.replace(/^http:/, "https:");
  }

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => console.log("Hover preview interrupted:", err));
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="flex gap-4 group p-2 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
      <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
        <div className="relative w-44 md:w-56 aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            playsInline
            preload="metadata"
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[11px] font-mono px-1.5 py-0.5 rounded">
            {item.videoid.videoduration || "00:00"}
          </div>
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/watch/${item.videoid._id}`}>
          <h3 className="font-bold text-sm md:text-base line-clamp-2 text-zinc-900 dark:text-zinc-100 mb-1 leading-tight">
            {item.videoid.videotitle}
          </h3>
        </Link>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {item.videoid.videochanel}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {item.videoid.views?.toLocaleString() || 0} views •{" "}
          {item.videoid.createdAt ? formatDistanceToNow(new Date(item.videoid.createdAt)) : "some time"} ago
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 font-mono">
          Watched {formatDistanceToNow(new Date(item.createdAt))} ago
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full focus:outline-none flex items-center justify-center cursor-pointer transition-opacity">
          <MoreVertical className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl">
          <DropdownMenuItem onClick={onRemove} className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 text-red-600 dark:text-red-400">
            <X className="w-4 h-4 mr-2" />
            Remove from watch history
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
