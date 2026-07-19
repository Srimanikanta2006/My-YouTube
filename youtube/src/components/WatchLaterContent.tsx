"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBackendUrl } from "../lib/urlHelper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import axiosInstance from "../lib/axiosinstance";
import { useUser } from "../lib/AuthContext";

export default function WatchLaterContent() {
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadWatchLater();
    }
    const handleListChange = () => {
      if (user) loadWatchLater();
    };
    window.addEventListener("video-list-changed", handleListChange);
    return () => window.removeEventListener("video-list-changed", handleListChange);
  }, [user]);

  const loadWatchLater = async () => {
    if (!user) return;

    try {
      const watchLaterData = await axiosInstance.get(`/watch/${user?._id}`);
      const validItems = (watchLaterData.data || []).filter((item: any) => item && item.videoid);
      setWatchLater(validItems);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Save videos for later</h2>
        <p className="text-gray-600">
          Sign in to access your Watch later playlist.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading watch later...</div>;
  }
  const handleRemoveFromWatchLater = async (videoId: string, watchLaterId: string) => {
    try {
      console.log("Removing from watch later:", videoId);
      await axiosInstance.post(`/watch/${videoId}`, { userId: user?._id });
      setWatchLater(watchLater.filter((item) => item._id !== watchLaterId));
    } catch (error) {
      console.error("Error removing from watch later:", error);
    }
  };

  if (watchLater.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No videos saved</h2>
        <p className="text-gray-600">
          Videos you save for later will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{watchLater.length} videos</p>
        <Button className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Play all
        </Button>
      </div>

      <div className="space-y-4">
        {watchLater.map((item) => (
          <VideoRowItem
            key={item._id}
            item={item}
            onRemove={() => handleRemoveFromWatchLater(item.videoid._id, item._id)}
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
    <div className="flex gap-4 group">
      <Link href={`/watch/${item.videoid._id}`} className="shrink-0">
        <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
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
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
            {item.videoid.videoduration || "00:00"}
          </div>
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/watch/${item.videoid._id}`}>
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
            {item.videoid.videotitle}
          </h3>
        </Link>
        <p className="text-sm text-gray-600">
          {item.videoid.videochanel}
        </p>
        <p className="text-sm text-gray-600">
          {item.videoid.views?.toLocaleString() || 0} views •{" "}
          {item.videoid.createdAt ? formatDistanceToNow(new Date(item.videoid.createdAt)) : "some time"} ago
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Added {formatDistanceToNow(new Date(item.createdAt))} ago
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-full focus:outline-none flex items-center justify-center cursor-pointer">
          <MoreVertical className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRemove}>
            <X className="w-4 h-4 mr-2" />
            Remove from Watch later
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
