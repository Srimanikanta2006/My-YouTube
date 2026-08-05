import React, { useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getBackendUrl } from "../lib/urlHelper";
import { useUser } from "../lib/AuthContext";
import axiosInstance from "../lib/axiosinstance";
import { Crown, MoreVertical } from "lucide-react";
import { useRouter } from "next/router";

export default function VideoCard({ video, horizontal }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(video?.videotitle || "");
  const [editDescription, setEditDescription] = useState(video?.description || video?.videodescription || "");
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
  const isChannelPage = router.pathname.startsWith("/channel");
  const channelDisplayName = isOwner ? (user?.channelname || video?.videochanel) : video?.videochanel;

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
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
    setIsMenuOpen(false);
    setEditTitle(video?.videotitle || "");
    setEditDescription(video?.description || video?.videodescription || "");
    setIsEditing(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(false);
    setIsDeleting(true);
  };

  const handleSaveTitle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) return;
    try {
      setLoadingAction(true);
      await axiosInstance.patch(`/video/update/${video._id}`, {
        videotitle: editTitle.trim(),
        description: editDescription.trim().slice(0, 5000),
      });
      video.videotitle = editTitle.trim();
      video.description = editDescription.trim().slice(0, 5000);
      video.videodescription = editDescription.trim().slice(0, 5000);
      setIsEditing(false);
      window.dispatchEvent(new CustomEvent("video-list-changed"));
      window.dispatchEvent(new Event("storage"));
    } catch (err: any) {
      console.error("Save details error:", err);
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      alert("Failed to update video details: " + errMsg);
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

  if (horizontal) {
    return (
      <div
        className="group relative flex gap-3.5 w-full rounded-2xl p-1 sm:p-1.5 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 transition-all duration-200"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          href={`/watch/${video?._id}`}
          className="relative w-36 xs:w-40 sm:w-44 aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 shadow-xs border border-zinc-200/50 dark:border-zinc-800/80"
        >
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="metadata"
            className="object-cover w-full h-full"
          />
          {video?.isPremium && (
            <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white font-black text-[9px] uppercase px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5 text-white fill-white" />
              <span>PREMIUM</span>
            </div>
          )}
          <div className="absolute bottom-1 right-1 bg-black/75 text-white font-mono text-[10px] px-1 py-0.5 rounded">
            {video?.videoduration || "00:00"}
          </div>
        </Link>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <Link href={`/watch/${video?._id}`} className="block">
            <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug tracking-tight hover:text-red-600 transition-colors">
              {video?.videotitle}
            </h4>
          </Link>

          <Link
            href={`/channel/${video?.uploader}`}
            className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-white transition-colors mt-1 block truncate"
          >
            {channelDisplayName}
          </Link>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-normal">
            {video?.views?.toLocaleString() || 0} views •{" "}
            {video?.createdAt ? formatDistanceToNow(new Date(video.createdAt)) : "recently"}
          </p>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-md">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Title (required)</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl p-2.5 focus:border-zinc-900 dark:focus:border-white outline-none transition-colors"
            placeholder="Enter title"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Description (optional)</label>
            <span className="text-[10px] text-zinc-400 font-mono">{editDescription.length}/5000</span>
          </div>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full text-xs border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl p-2.5 focus:border-zinc-900 dark:focus:border-white outline-none transition-colors resize-y"
            placeholder="Enter video description (optional)"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditing(false);
            }}
            className="px-4 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-full font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={loadingAction}
            onClick={handleSaveTitle}
            className="px-4 py-1.5 text-xs bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-50 rounded-full font-bold transition-colors cursor-pointer shadow"
          >
            {loadingAction ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="space-y-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-4 rounded-2xl shadow-md">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
          Are you sure you want to permanently delete this video? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDeleting(false);
            }}
            className="px-4 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-full font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={loadingAction}
            onClick={handleDeleteVideo}
            className="px-4 py-1.5 text-xs bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-50 rounded-full font-bold transition-colors cursor-pointer shadow"
          >
            {loadingAction ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative block w-full rounded-2xl p-2 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/80 transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="space-y-3">
        {/* Video Thumbnail Box with YouTube Hover Zoom */}
        <Link href={`/watch/${video?._id}`} className="block relative aspect-video rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-sm group-hover:shadow-xl group-hover:scale-[1.03] transition-all duration-300 ease-out border border-zinc-200/50 dark:border-zinc-800/80">
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            preload="metadata"
            className="object-cover w-full h-full transform transition-transform duration-300"
          />

          {/* Premium Badge */}
          {video?.isPremium && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 z-10 border border-amber-300/40">
              <Crown className="w-3 h-3 text-white fill-white" />
              <span>PREMIUM</span>
            </div>
          )}

          {/* Video Duration Badge */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white font-medium font-mono text-[10px] px-1.5 py-[1px] rounded tracking-tight backdrop-blur-xs shadow-xs select-none">
            {video?.videoduration || "00:00"}
          </div>
        </Link>

        {/* Details Row: Avatar + Title & Meta */}
        <div className="flex gap-3 relative pt-1 px-1">
          <Link
            href={`/channel/${video?.uploader}`}
            className="flex-shrink-0 mt-0.5"
          >
            <Avatar className="w-9 h-9 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs hover:opacity-85 transition-opacity">
              <AvatarImage src={(isOwner ? user?.image : video?.uploaderImage || video?.channelImage || video?.userImage || video?.uploader?.image) || ""} />
              <AvatarFallback className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs border border-zinc-300/50 dark:border-zinc-700/50">
                {channelDisplayName?.[0]?.toUpperCase() || "V"}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0 pr-2">
            <Link href={`/watch/${video?._id}`} className="block">
              <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug tracking-tight hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                {video?.videotitle}
              </h3>
            </Link>

            <Link
              href={`/channel/${video?.uploader}`}
              className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold hover:text-zinc-900 dark:hover:text-white transition-colors mt-1 block truncate"
            >
              {channelDisplayName}
            </Link>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
              {video?.views?.toLocaleString() || 0} views •{" "}
              {video?.createdAt ? formatDistanceToNow(new Date(video.createdAt)) : "some time"} ago
            </p>
          </div>
        </div>
      </div>

      {/* 3 Dots Menu Button ONLY on Channel Page */}
      {isOwner && isChannelPage && (
        <div className="absolute right-2 bottom-3 z-20">
          <button
            onClick={handleMenuToggle}
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all opacity-100 text-zinc-600 dark:text-zinc-300 cursor-pointer"
            title="Video options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 bottom-full mb-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-0.5 w-36 sm:w-40 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden">
              <button
                onClick={handleEditClick}
                className="w-full text-left px-3.5 py-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors first:rounded-t-xl"
              >
                <span>✏️</span> Edit Details
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-full text-left px-3.5 py-2 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2 cursor-pointer transition-colors last:rounded-b-xl"
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
