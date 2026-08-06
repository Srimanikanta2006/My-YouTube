import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Check,
  Clock,
  Crown,
  Download,
  MoreHorizontal,
  MoreVertical,
  Share,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "../lib/AuthContext";
import Link from "next/link";
import { addNotification } from "@/lib/notificationHelper";
import { useRouter } from "next/router";
import axiosInstance from "../lib/axiosinstance";
import { getBackendUrl } from "../lib/urlHelper";

const VideoInfo = ({ video, onStartWatchParty }: any) => {
  const router = useRouter();
  const [videoData, setVideoData] = useState(video);

  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [dislikeAnimating, setDislikeAnimating] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user, isSidebarCollapsed } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close 3-dots dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };

    if (isMoreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  // Sync videoData state with prop changes
  useEffect(() => {
    setVideoData(video);
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
  }, [video]);

  // Live WebSocket & Event Listener for Real-Time Title & Description Updates
  useEffect(() => {
    if (!video?._id) return;

    const fetchLatest = async () => {
      try {
        const res = await axiosInstance.get(`/video/get/${video._id}`);
        if (res.data) {
          setVideoData(res.data);
          if (typeof res.data.Like === "number") setlikes(res.data.Like);
          if (typeof res.data.Dislike === "number") setDislikes(res.data.Dislike);
        }
      } catch (e) {}
    };

    const handleListChange = () => fetchLatest();
    window.addEventListener("video-list-changed", handleListChange);

    let ws: WebSocket | null = null;
    try {
      const backendUrl = getBackendUrl();
      const wsUrl = backendUrl.replace(/^http/, "ws");
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "global-video-updated" && data.videoId === video._id) {
            setVideoData((prev: any) => ({
              ...prev,
              videotitle: data.videotitle !== undefined ? data.videotitle : prev.videotitle,
              description: data.description !== undefined ? data.description : prev.description,
            }));
          }
          if (data.type === "subscribe-updated") {
            const targetId = video?.uploader?.toString();
            const targetName = video?.videochanel;
            if (
              (data.targetChannelId && (data.targetChannelId === targetId || data.targetChannelId === targetName)) ||
              (data.targetChannelName && data.targetChannelName === targetName)
            ) {
              if (typeof data.subscriberCount === "number") {
                setSubscriberCount(data.subscriberCount);
              }
            }
          }
        } catch (err) {}
      };
    } catch (err) {}

    return () => {
      window.removeEventListener("video-list-changed", handleListChange);
      if (ws) ws.close();
    };
  }, [video?._id]);

  useEffect(() => {
    // Reset all status hooks
    setIsLiked(false);
    setIsDisliked(false);
    setIsWatchLater(false);
    setIsSubscribed(false);

    if (!video?._id) return;

    if (user) {
      const userSubs = Array.isArray(user.subscriptions) ? user.subscriptions.map((s: any) => s.toString()) : [];
      const uploaderId = video.uploader ? video.uploader.toString() : "";
      const channelName = video.videochanel ? video.videochanel.toString() : "";
      const isSub = Boolean(
        (uploaderId && userSubs.includes(uploaderId)) ||
        (channelName && userSubs.includes(channelName))
      );
      setIsSubscribed(isSub);
    } else if (typeof window !== "undefined") {
      const subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      setIsSubscribed(
        subscribedChannels.includes(video.videochanel) ||
        subscribedChannels.includes(video.uploader)
      );
    }

    if (typeof window !== "undefined") {
      const dislikedVids = JSON.parse(localStorage.getItem("dislikedVideos") || "[]");
      const currentDisliked = dislikedVids.includes(video._id);
      setIsDisliked(currentDisliked);
    }

    if (!user) return;

    const fetchVideoUserStates = async () => {
      try {
        const likeRes = await axiosInstance.get(`/like/${user._id}`);
        const isCurrentVideoLiked = likeRes.data.some(
          (item: any) => item.videoid && (item.videoid._id === video._id || item.videoid === video._id)
        );
        setIsLiked(isCurrentVideoLiked);

        const watchRes = await axiosInstance.get(`/watch/${user._id}`);
        const isCurrentVideoWatchLater = watchRes.data.some(
          (item: any) => item.videoid && (item.videoid._id === video._id || item.videoid === video._id)
        );
        setIsWatchLater(isCurrentVideoWatchLater);
      } catch (error) {
        console.error("Error fetching user states for video:", error);
      }
    };

    fetchVideoUserStates();
  }, [user?._id, user?.subscriptions, video?._id, video?.uploader, video?.videochanel]);

  const likeActionSeqRef = useRef<number>(0);

  const handleLike = async () => {
    if (!user) {
      showToast("Please sign in to like videos.");
      return;
    }

    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 250);

    const currentSeq = ++likeActionSeqRef.current;
    const prevIsLiked = isLiked;
    const prevIsDisliked = isDisliked;

    if (prevIsLiked) {
      setIsLiked(false);
      setlikes((prev: number) => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setlikes((prev: number) => prev + 1);
      if (prevIsDisliked) {
        setIsDisliked(false);
        setDislikes((prev: number) => Math.max(0, prev - 1));
      }
    }

    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user._id,
      });
      if (currentSeq === likeActionSeqRef.current && res.data) {
        setIsLiked(Boolean(res.data.liked));
        setIsDisliked(Boolean(res.data.disliked));
        if (typeof res.data.likes === "number") setlikes(res.data.likes);
        if (typeof res.data.dislikes === "number") setDislikes(res.data.dislikes);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      showToast("Please sign in to save videos to Watch Later.");
      return;
    }
    const nextWatchLater = !isWatchLater;
    setIsWatchLater(nextWatchLater);
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data?.watchlater !== undefined) {
        setIsWatchLater(Boolean(res.data.watchlater));
      }
    } catch {
      setIsWatchLater(!nextWatchLater);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      showToast("Please sign in to dislike videos.");
      return;
    }

    setDislikeAnimating(true);
    setTimeout(() => setDislikeAnimating(false), 250);

    const currentSeq = ++likeActionSeqRef.current;
    const prevIsDisliked = isDisliked;
    const prevIsLiked = isLiked;

    if (prevIsDisliked) {
      setIsDisliked(false);
      setDislikes((prev: number) => Math.max(0, prev - 1));
    } else {
      setIsDisliked(true);
      setDislikes((prev: number) => prev + 1);
      if (prevIsLiked) {
        setIsLiked(false);
        setlikes((prev: number) => Math.max(0, prev - 1));
      }
    }

    try {
      const res = await axiosInstance.post(`/like/dislike/${video._id}`, {
        userId: user._id,
      });
      if (currentSeq === likeActionSeqRef.current && res.data) {
        setIsLiked(Boolean(res.data.liked));
        setIsDisliked(Boolean(res.data.disliked));
        if (typeof res.data.likes === "number") setlikes(res.data.likes);
        if (typeof res.data.dislikes === "number") setDislikes(res.data.dislikes);
      }
    } catch (error) {
      console.error("Error toggling dislike:", error);
    }
  };

  const [subscriberCount, setSubscriberCount] = useState<number>(
    typeof video?.subscribersCount === "number"
      ? video.subscribersCount
      : (video?.subscribers ? video.subscribers.length : 0)
  );

  useEffect(() => {
    const currentObj = videoData || video;
    if (currentObj) {
      const count = typeof currentObj.subscribersCount === "number"
        ? currentObj.subscribersCount
        : (Array.isArray(currentObj.subscribers) ? currentObj.subscribers.length : 0);
      setSubscriberCount(count);
    }
  }, [videoData, video]);

  const handleSubscribe = async () => {
    if (!user) {
      showToast("Please sign in to subscribe to channels.");
      return;
    }
    if (video?.videochanel || video?.uploader) {
      const nextSubState = !isSubscribed;
      setIsSubscribed(nextSubState);
      setSubscriberCount((prev: number) => (nextSubState ? prev + 1 : Math.max(0, prev - 1)));

      let subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      const name = video.videochanel;
      const uploaderId = video.uploader;

      if (nextSubState) {
        if (name && !subscribedChannels.includes(name)) subscribedChannels.push(name);
        if (uploaderId && !subscribedChannels.includes(uploaderId)) subscribedChannels.push(uploaderId);
      } else {
        subscribedChannels = subscribedChannels.filter(
          (c: string) => c !== name && c !== uploaderId
        );
      }
      localStorage.setItem("subscribedChannels", JSON.stringify(subscribedChannels));
      window.dispatchEvent(new Event("subscription-changed"));

      try {
        const res = await axiosInstance.post("/user/subscribe", {
          subscriberId: user._id,
          targetChannelId: uploaderId,
          targetChannelName: name,
        });
        if (res.data) {
          setIsSubscribed(Boolean(res.data.subscribed));
          if (typeof res.data.subscriberCount === "number") {
            setSubscriberCount(res.data.subscriberCount);
          }
        }
      } catch (err) {
        console.error("Error saving subscription:", err);
      }

      if (nextSubState) {
        addNotification({
          recipientUserId: uploaderId,
          type: "subscribe",
          title: `🔥 ${user.channelname || user.name || "User"} subscribed to your channel.`,
          message: "Someone subscribed to your channel",
          actionUrl: uploaderId ? `/channel/${uploaderId}` : "/",
          avatar: user.image || "",
        });
      }
    }
  };
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const getCleanVideoSrc = () => {
    if (!video?.filepath) return "";
    if (video.filepath.startsWith("http")) return video.filepath;
    
    let relativePath = video.filepath.replace(/\\/g, "/");
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.slice(1);
    }
    
    const backendUrl = getBackendUrl();
    let src = `${backendUrl}/${relativePath}`;
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      src = src.replace(/^http:/, "https:");
    }
    return src;
  };

  const videoSrc = getCleanVideoSrc();

  const handleShare = async () => {
    const videoUrl = typeof window !== "undefined" ? window.location.href : "";
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoData.videotitle,
          text: `Check out this video: ${videoData.videotitle}`,
          url: videoUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if share was canceled or failed
      }
    }
    
    try {
      await navigator.clipboard.writeText(videoUrl);
      setIsShareCopied(true);
      showToast("Link copied to clipboard!");
      setTimeout(() => setIsShareCopied(false), 2500);
    } catch (err) {
      showToast("Failed to copy link.");
    }
  };

  const [downloading, setDownloading] = useState(false);

  // Modal State for Daily Limit Reached
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitDetails, setLimitDetails] = useState<any>(null);

  const handleDownload = async () => {
    if (!user) {
      showToast("Please sign in to download videos.");
      return;
    }

    try {
      setDownloadState("loading");
      setDownloadProgress(10);

      const progressTimer = setInterval(() => {
        setDownloadProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 150);

      const trackRes = await axiosInstance.post("/download/track", {
        userId: user._id,
        videoId: video._id,
      });

      const targetUrl = trackRes.data?.downloadUrl || videoSrc;
      const response = await fetch(targetUrl);
      if (!response.ok) {
        window.open(targetUrl, "_blank");
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        
        const cleanTitle = (videoData.videotitle || "video")
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        a.download = `${cleanTitle}.mp4`;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        a.remove();
      }

      clearInterval(progressTimer);
      setDownloadProgress(100);

      setTimeout(() => {
        setDownloadState("success");
        showToast("Video downloaded & saved!");
        addNotification({
          type: "download",
          title: "⬇ Video downloaded successfully.",
          message: `"${videoData.videotitle || "Video"}" saved to offline downloads.`,
          actionUrl: "/downloads",
        });
        setTimeout(() => {
          setDownloadState("idle");
          setDownloadProgress(0);
        }, 3500);
      }, 300);
    } catch (err: any) {
      setDownloadState("idle");
      setDownloadProgress(0);
      if (err.response?.status === 403 && err.response?.data?.limitReached) {
        setLimitDetails(err.response.data);
        setShowLimitModal(true);
      } else {
        console.error("Download error:", err);
        showToast("Could not download video. Please try again.");
      }
    }
  };

  const isVideoOwner = Boolean(
    user && (user._id === video?.uploader || (video?.videochanel && user?.channelname === video.videochanel))
  );

  const renderFormattedDescription = (text: string) => {
    const content = text || videoData?.description || videoData?.videodescription;
    if (!content || !content.trim()) {
      return <span className="italic text-zinc-400 dark:text-zinc-500">No description provided for this video.</span>;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return (
      <span className="whitespace-pre-wrap break-words">
        {parts.map((part: string, i: number) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            );
          }
          return part;
        })}
      </span>
    );
  };

  const activeDescriptionText = videoData?.description || videoData?.videodescription || "";

  return (
    <div className="space-y-3 sm:space-y-4 px-3 sm:px-0 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight leading-snug">{videoData.videotitle}</h1>

      {/* Dynamic Responsive Meta Row */}
      <div className="flex flex-col min-[1280px]:flex-row min-[1280px]:items-center justify-between gap-3 sm:gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4">
        {/* Left Section: Channel Info & Subscribe Button */}
        <div className="flex items-center justify-between min-[1280px]:justify-start gap-3 sm:gap-4 w-full min-[1280px]:w-auto shrink-0 flex-nowrap">
          <Link href={`/channel/${video.uploader}`} className="flex items-center gap-3 hover:opacity-80 transition-all cursor-pointer shrink-0">
            <Avatar className="w-10 h-10 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs">
              <AvatarImage src={video.uploaderImage} />
              <AvatarFallback className="bg-red-600 text-white font-bold">
                {video.videochanel ? video.videochanel[0].toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <p className="font-bold text-sm sm:text-base">{video.videochanel}</p>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"}
              </p>
            </div>
          </Link>

          {/* Subscribe Button */}
          {!isVideoOwner && (
            <Button
              className={`rounded-full font-bold px-4 sm:px-5 py-1.5 text-xs sm:text-sm transition-all shadow-sm ${
                isSubscribed
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
              }`}
              onClick={handleSubscribe}
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </Button>
          )}
        </div>

        {/* Right Section: Action Buttons (Always 1 Single Horizontal Row, Fills Evenly Without Text on Mobile) */}
        <div className="flex items-center flex-row flex-nowrap gap-1.5 sm:gap-2 w-full min-[1280px]:w-auto shrink-0 py-0.5 relative z-30">
          {/* Watch Party Button */}
          {onStartWatchParty && (
            <button
              onClick={onStartWatchParty}
              className="flex-1 min-[1280px]:flex-none bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-full shrink-0 cursor-pointer h-9 md:h-10 text-xs md:text-sm px-2.5 sm:px-3.5 font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/20 hover:scale-105 active:scale-95 whitespace-nowrap"
              title="Start Watch Party with Friends"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Watch Party</span>
            </button>
          )}

          {/* Pill Container: Like & Dislike (Always 100% visible, count & icons never hidden/squeezed) */}
          <div className="flex-none flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200/80 dark:border-zinc-700/80 overflow-hidden shrink-0">
            <button
              className="hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer h-9 md:h-10 px-3 sm:px-3.5 text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all select-none whitespace-nowrap shrink-0"
              onClick={handleLike}
              title="Like"
            >
              <ThumbsUp
                className={`w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  likeAnimating ? "scale-125" : "scale-100"
                } ${
                  isLiked ? "fill-zinc-900 text-zinc-900 dark:fill-zinc-100 dark:text-zinc-100" : ""
                }`}
              />
              <span key={likes} className="inline-block animate-in slide-in-from-bottom-2 duration-150">
                {likes.toLocaleString()}
              </span>
            </button>
            <div className="w-px h-4.5 bg-zinc-300 dark:bg-zinc-700 shrink-0" />
            <button
              className="hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer h-9 md:h-10 px-3 sm:px-3.5 text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all select-none whitespace-nowrap shrink-0"
              onClick={handleDislike}
              title="Dislike"
            >
              <ThumbsDown
                className={`w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  dislikeAnimating ? "scale-125" : "scale-100"
                } ${
                  isDisliked ? "fill-zinc-900 text-zinc-900 dark:fill-zinc-100 dark:text-zinc-100" : ""
                }`}
              />
              <span key={dislikes} className="inline-block animate-in slide-in-from-bottom-2 duration-150">
                {dislikes.toLocaleString()}
              </span>
            </button>
          </div>

          {/* Watch Later / Save Button */}
          <button
            className={`flex-1 min-[1280px]:flex-none flex items-center justify-center gap-1.5 h-9 md:h-10 px-2.5 sm:px-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full font-semibold text-xs md:text-sm shrink-0 cursor-pointer transition-all select-none whitespace-nowrap ${
              isWatchLater ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold" : ""
            }`}
            onClick={handleWatchLater}
            title={isWatchLater ? "Saved in Watch Later" : "Save to Watch Later"}
          >
            {isWatchLater ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 animate-in zoom-in-50 duration-150 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 transition-opacity duration-150 shrink-0" />
            )}
            <span className="hidden sm:inline transition-all duration-150">{isWatchLater ? "Saved" : "Watch Later"}</span>
          </button>

          {/* Share Button */}
          <button
            className="flex-1 min-[1280px]:flex-none bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full shrink-0 cursor-pointer h-9 md:h-10 text-xs md:text-sm px-2.5 sm:px-3.5 font-semibold flex items-center justify-center gap-1.5 transition-all select-none whitespace-nowrap"
            onClick={handleShare}
            title="Share Video"
          >
            {isShareCopied ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 animate-in zoom-in-50 duration-150 shrink-0" />
            ) : (
              <Share className="w-4 h-4 shrink-0" />
            )}
            <span className="hidden sm:inline">{isShareCopied ? "Copied" : "Share"}</span>
          </button>

          {/* Download Button (Visible outside ONLY when sidebar is COLLAPSED i.e. isSidebarCollapsed === true) */}
          {isSidebarCollapsed && (
            <button
              className={`flex-1 min-[1280px]:flex-none bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full shrink-0 transition-all duration-300 cursor-pointer h-9 md:h-10 text-xs md:text-sm px-2.5 sm:px-3.5 font-semibold text-center flex items-center justify-center select-none whitespace-nowrap ${
                downloadState === "success" ? "bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 border border-green-300/50 dark:border-green-800/50" : ""
              }`}
              onClick={handleDownload}
              disabled={downloadState === "loading"}
              title="Download Video"
            >
              {downloadState === "idle" && (
                <>
                  <Download className="w-4 h-4 mr-0 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline">Download</span>
                </>
              )}
              {downloadState === "loading" && (
                <>
                  <div className="relative w-4 h-4 mr-0 sm:mr-2 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-zinc-300 dark:text-zinc-700"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-red-600 dark:text-red-500 transition-all duration-150 ease-out"
                        strokeDasharray={`${downloadProgress}, 100`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                  <span className="hidden sm:inline">Downloading...</span>
                </>
              )}
              {downloadState === "success" && (
                <>
                  <Check className="w-4 h-4 mr-0 sm:mr-1.5 text-green-600 dark:text-green-400 animate-in zoom-in-75 duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0" />
                  <span className="hidden sm:inline">Saved!</span>
                </>
              )}
            </button>
          )}

          {/* Vertical 3-Dots Menu Button (Visible ONLY when sidebar is EXPANDED i.e. isSidebarCollapsed === false) */}
          {!isSidebarCollapsed && (
            <div ref={moreMenuRef} className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMoreMenuOpen((prev) => !prev);
                }}
                className="w-9 h-9 md:w-10 md:h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all"
                title="More options"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isMoreMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-1.5 w-52 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMoreMenuOpen(false);
                      handleDownload();
                    }}
                    disabled={downloadState === "loading"}
                    className="w-full text-left px-4 py-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                    <span>{downloadState === "loading" ? "Downloading..." : downloadState === "success" ? "Downloaded & Saved" : "Download Video"}</span>
                  </button>
                  {onStartWatchParty && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMoreMenuOpen(false);
                        onStartWatchParty();
                      }}
                      className="w-full text-left px-4 py-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 cursor-pointer transition-colors border-t border-zinc-100 dark:border-zinc-800/80"
                    >
                      <Users className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                      <span>Watch Party</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Description Card Box */}
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 transition-colors">
        <div className="flex gap-4 text-sm font-bold mb-2 text-zinc-900 dark:text-zinc-100">
          <span>{(videoData.views || 0).toLocaleString()} views</span>
          <span>{videoData.createdAt ? formatDistanceToNow(new Date(videoData.createdAt), { addSuffix: true }) : "Recently"}</span>
        </div>
        <div className={`text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal ${showFullDescription ? "" : "line-clamp-3"}`}>
          {renderFormattedDescription(activeDescriptionText)}
        </div>
        {activeDescriptionText.length > 100 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2.5 p-0 h-auto font-bold text-zinc-900 dark:text-white hover:underline cursor-pointer"
            onClick={() => setShowFullDescription(!showFullDescription)}
          >
            {showFullDescription ? "Show less" : "...more"}
          </Button>
        )}
      </div>
      
      {toastMessage && typeof window !== "undefined" && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold px-5 py-3 rounded-full shadow-2xl z-[9999] flex items-center gap-2.5 border border-zinc-800 dark:border-zinc-200 backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-none">
          <Check className="w-4 h-4 text-green-400 dark:text-green-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}

      {/* Daily Download Limit Exceeded Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Daily Download Limit Reached
            </h3>
            
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4 px-2">
              {limitDetails?.message || `Daily download limit reached for your ${limitDetails?.userPlan || "Free"} plan (${limitDetails?.currentCount || 1}/${limitDetails?.maxAllowed || 1}). Upgrade to Bronze, Silver, or Gold to download more videos!`}
            </p>

            <div className="w-full bg-gray-100 dark:bg-zinc-800/80 rounded-2xl p-4 mb-6 border border-gray-200/60 dark:border-zinc-700/60">
              <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                <span>Usage ({limitDetails?.userPlan || "Free"})</span>
                <span>{limitDetails?.currentCount || 1} / {limitDetails?.maxAllowed || 1}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (((limitDetails?.currentCount || 1) / (limitDetails?.maxAllowed || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <Button
              onClick={() => {
                setShowLimitModal(false);
                router.push("/membership");
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-full py-3 text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Crown className="w-4 h-4 fill-white" />
              <span>Upgrade Plan to Download More</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoInfo;
