import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getBackendUrl } from "../lib/urlHelper";
import { useUser } from "../lib/AuthContext";
import axiosInstance from "../lib/axiosinstance";
import { MoreVertical } from "lucide-react";

export default function VideoCard({ video }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(video?.videotitle || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const backendUrl = getBackendUrl();
  const normalizedPath = video?.filepath ? video.filepath.replace(/\\/g, "/") : "";
  const videoSrcBase = normalizedPath.startsWith("http") ? normalizedPath : `${backendUrl}/${normalizedPath}`;
  let videoSrc = videoSrcBase ? `${videoSrcBase}#t=0.1` : "";
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    videoSrc = videoSrc.replace(/^http:/, "https:");
  }

  const isOwner = user && user._id === video?.uploader;

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => console.log("Hover preview play interrupted:", err));
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsMenuOpen(false);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    setIsMenuOpen(false);
  };

  const handleSaveTitle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      setLoadingAction(true);
      await axiosInstance.patch(`/video/update/${video._id}`, {
        videotitle: editTitle.trim(),
      });
      setIsEditing(false);
      window.dispatchEvent(new CustomEvent("video-list-changed"));
    } catch (err: any) {
      console.error("Save title error:", err);
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      alert("Failed to update video title: " + errMsg);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteVideo = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setLoadingAction(true);
      await axiosInstance.delete(`/video/delete/${video._id}`);
      setIsDeleting(false);
      window.dispatchEvent(new CustomEvent("video-list-changed"));
    } catch (err: any) {
      console.error("Delete video error:", err);
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      alert("Failed to delete video: " + errMsg);
    } finally {
      setLoadingAction(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-3 bg-gray-50 border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Edit Video Title</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl p-2.5 focus:border-red-500 outline-none transition-colors"
            placeholder="Enter new title"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditing(false);
            }}
            className="px-3.5 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded-full font-semibold text-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={loadingAction}
            onClick={handleSaveTitle}
            className="px-3.5 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-full font-semibold text-white transition-colors cursor-pointer"
          >
            {loadingAction ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="space-y-3 bg-red-50/85 border border-red-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <p className="text-xs font-medium text-red-800 leading-relaxed">
          Are you sure you want to permanently delete this video? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDeleting(false);
            }}
            className="px-3.5 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded-full font-semibold text-gray-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={loadingAction}
            onClick={handleDeleteVideo}
            className="px-3.5 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-full font-semibold text-white transition-colors cursor-pointer"
          >
            {loadingAction ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative block w-full" onMouseLeave={handleMouseLeave}>
      <Link href={`/watch/${video?._id}`} className="block">
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
            <video
              ref={videoRef}
              src={videoSrc}
              muted
              playsInline
              preload="metadata"
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
              onMouseEnter={handleMouseEnter}
            />
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
              {video?.videoduration || "00:00"}
            </div>
          </div>
          <div className="flex gap-3 relative">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback>{video?.videochanel?.[0] || "V"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pr-8">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-red-600 leading-tight">
                {video?.videotitle}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{video?.videochanel}</p>
              <p className="text-sm text-gray-600">
                {video?.views?.toLocaleString() || 0} views •{" "}
                {video?.createdAt ? formatDistanceToNow(new Date(video.createdAt)) : "some time"} ago
              </p>
            </div>
          </div>
        </div>
      </Link>
      {isOwner && (
        <div className="absolute right-0 bottom-8 z-20">
          <button
            onClick={handleMenuToggle}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-all opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-500 font-bold cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 bg-white border rounded-xl shadow-lg py-1.5 w-44 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={handleEditClick}
                className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
              >
                <span>✏️</span> Edit Title
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 border-t flex items-center gap-2 cursor-pointer"
              >
                <span>🗑️</span> Delete permanently
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
