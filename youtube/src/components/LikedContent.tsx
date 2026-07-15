"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, ThumbsUp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      console.log("Unliking video:", videoId, "for user:", user._id);
      await axiosInstance.post(`/like/${videoId}`, { userId: user?._id });
      setLikedVideos(likedVideos.filter((item) => item._id !== likedVideoId));
    } catch (error) {
      console.error("Error unliking video:", error);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <ThumbsUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Keep track of videos you like
        </h2>
        <p className="text-gray-600">Sign in to see your liked videos.</p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading liked videos...</div>;
  }

  if (likedVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <ThumbsUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No liked videos yet</h2>
        <p className="text-gray-600">Videos you like will appear here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{likedVideos.length} videos</p>
        <Button className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Play all
        </Button>
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
  
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  const normalizedPath = item.videoid?.filepath ? item.videoid.filepath.replace(/\\/g, "/") : "";
  const videoSrc = normalizedPath.startsWith("http") ? normalizedPath : `${backendUrl}/${normalizedPath}`;

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
      <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
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
          Liked {formatDistanceToNow(new Date(item.createdAt))} ago
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-full focus:outline-none flex items-center justify-center cursor-pointer">
          <MoreVertical className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRemove}>
            <X className="w-4 h-4 mr-2" />
            Remove from liked videos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
