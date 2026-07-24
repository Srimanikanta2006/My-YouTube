"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, ThumbsUp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBackendUrl } from "../lib/urlHelper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

export default function LikedVideosContent() {
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadLikedVideos();
    }
    const handleListChange = () => {
      if (user) loadLikedVideos();
    };
    window.addEventListener("video-list-changed", handleListChange);
    return () => window.removeEventListener("video-list-changed", handleListChange);
  }, [user]);

  const loadLikedVideos = async () => {
    if (!user) return;

    try {
      const likedData = await axiosInstance.get(`/like/${user?._id}`);
      const validItems = (likedData.data || []).filter((item: any) => item && item.videoid);
      setLikedVideos(validItems);
    } catch (error) {
      console.error("Error loading liked videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlikeVideo = async (videoId: string, likedVideoId: string) => {
    if (!user) return;

    try {
      await axiosInstance.post(`/like/${videoId}`, { userId: user?._id });
      setLikedVideos(likedVideos.filter((item) => item._id !== likedVideoId));
    } catch (error) {
      console.error("Error unliking video:", error);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 text-zinc-900 dark:text-zinc-100">
        <ThumbsUp className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
        <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">
          Keep track of videos you like
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to see your liked videos.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 text-zinc-500 dark:text-zinc-400 animate-pulse">Loading liked videos...</div>;
  }

  if (likedVideos.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-900 dark:text-zinc-100">
        <ThumbsUp className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
        <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">No liked videos yet</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Videos you like will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100 max-w-5xl">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Liked Videos</h1>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">{likedVideos.length} videos</p>
        </div>
        {likedVideos.length > 0 && (
          <Link href={`/watch/${likedVideos[0].videoid._id}`}>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-5 flex items-center gap-2 cursor-pointer">
              <Play className="w-4 h-4 fill-white" />
              <span>Play All</span>
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {likedVideos.map((item) => (
          <VideoRowItem
            key={item._id}
            item={item}
            onRemove={() => handleUnlikeVideo(item.videoid._id, item._id)}
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
          Liked {formatDistanceToNow(new Date(item.createdAt))} ago
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full focus:outline-none flex items-center justify-center cursor-pointer transition-opacity">
          <MoreVertical className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl">
          <DropdownMenuItem onClick={onRemove} className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 text-red-600 dark:text-red-400">
            <X className="w-4 h-4 mr-2" />
            Remove from liked videos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
