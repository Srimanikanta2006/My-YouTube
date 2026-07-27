import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Crown,
  Download,
  MoreHorizontal,
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
import { useRouter } from "next/router";
import axiosInstance from "../lib/axiosinstance";
import { getBackendUrl } from "../lib/urlHelper";

const VideoInfo = ({ video, onStartWatchParty }: any) => {
  const router = useRouter();
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "success" | "error">("idle");

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    // Reset all status hooks
    setIsLiked(false);
    setIsDisliked(false);
    setIsWatchLater(false);
    setIsSubscribed(false);
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);

    if (typeof window !== "undefined" && video?._id) {
      // Load Dislike state from localStorage
      const dislikedVids = JSON.parse(localStorage.getItem("dislikedVideos") || "[]");
      const currentDisliked = dislikedVids.includes(video._id);
      setIsDisliked(currentDisliked);
      if (currentDisliked) {
        setDislikes((prev: any) => prev + 1);
      }

      // Load Subscribe state from localStorage
      const subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      setIsSubscribed(subscribedChannels.includes(video.videochanel));
    }

    if (!user || !video?._id) return;

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
      } catch (err) {
        console.warn("Error fetching video user states:", err);
      }
    };

    fetchVideoUserStates();
  }, [user, video]);

  const hasRecordedHistoryRef = React.useRef(false);

  useEffect(() => {
    if (!video?._id || hasRecordedHistoryRef.current) return;
    hasRecordedHistoryRef.current = true;

    const handleviews = async () => {
      try {
        if (user?._id) {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: user._id,
          });
        } else {
          await axiosInstance.post(`/history/views/${video._id}`);
        }
      } catch (error) {
        console.error("Error updating views:", error);
      }
    };
    handleviews();
  }, [video?._id, user?._id]);

  useEffect(() => {
    if (!video?._id) return;
    const pollVideoDetails = async () => {
      try {
        const res = await axiosInstance.get(`/video/get/${video._id}`);
        if (res.data) {
          setlikes(res.data.Like || 0);
          // Only sync database dislikes if not locally toggling
          setDislikes(res.data.Dislike || 0);
        }
      } catch (err) {
        console.warn("Error polling video counts:", err);
      }
    };

    const interval = setInterval(() => {
      pollVideoDetails();
    }, 5000);

    return () => clearInterval(interval);
  }, [video?._id]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      
      const currentlyLiked = res.data.liked;
      setIsLiked(currentlyLiked);
      
      if (currentlyLiked) {
        setlikes((prev: any) => prev + 1);
        if (isDisliked) {
          setDislikes((prev: any) => Math.max(0, prev - 1));
          setIsDisliked(false);
          if (typeof window !== "undefined") {
            let dislikedVids = JSON.parse(localStorage.getItem("dislikedVideos") || "[]");
            dislikedVids = dislikedVids.filter((id: string) => id !== video._id);
            localStorage.setItem("dislikedVideos", JSON.stringify(dislikedVids));
          }
        }
      } else {
        setlikes((prev: any) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    try {
      const currentlyDisliked = !isDisliked;
      setIsDisliked(currentlyDisliked);
      
      // Update database dislike count
      await axiosInstance.post(`/like/dislike/${video._id}`, {
        increment: currentlyDisliked
      });

      if (currentlyDisliked) {
        setDislikes((prev: any) => prev + 1);
        if (typeof window !== "undefined") {
          const dislikedVids = JSON.parse(localStorage.getItem("dislikedVideos") || "[]");
          if (!dislikedVids.includes(video._id)) {
            dislikedVids.push(video._id);
            localStorage.setItem("dislikedVideos", JSON.stringify(dislikedVids));
          }
        }
        
        if (isLiked) {
          await axiosInstance.post(`/like/${video._id}`, {
            userId: user?._id,
          });
          setIsLiked(false);
          setlikes((prev: any) => Math.max(0, prev - 1));
        }
      } else {
        setDislikes((prev: any) => Math.max(0, prev - 1));
        if (typeof window !== "undefined") {
          let dislikedVids = JSON.parse(localStorage.getItem("dislikedVideos") || "[]");
          dislikedVids = dislikedVids.filter((id: string) => id !== video._id);
          localStorage.setItem("dislikedVideos", JSON.stringify(dislikedVids));
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubscribe = () => {
    if (!user) return;
    if (typeof window !== "undefined" && video?.videochanel) {
      let subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
      const name = video.videochanel;
      const uploaderId = video.uploader;

      const isSub =
        subscribedChannels.includes(name) ||
        (uploaderId && subscribedChannels.includes(uploaderId));

      if (isSub) {
        subscribedChannels = subscribedChannels.filter(
          (c: string) => c !== name && c !== uploaderId
        );
        setIsSubscribed(false);
      } else {
        if (name && !subscribedChannels.includes(name)) subscribedChannels.push(name);
        if (uploaderId && !subscribedChannels.includes(uploaderId)) subscribedChannels.push(uploaderId);
        setIsSubscribed(true);
      }
      localStorage.setItem("subscribedChannels", JSON.stringify(subscribedChannels));
      window.dispatchEvent(new Event("subscription-changed"));
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
    
    // Normalise slashes and remove leading slash
    let relativePath = video.filepath.replace(/\\/g, "/");
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.slice(1);
    }
    
    // Strip trailing slash from backend URL
    const backendUrl = getBackendUrl();
    const cleanBackendUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    
    return `${cleanBackendUrl}/${relativePath}`;
  };

  const videoSrc = getCleanVideoSrc();

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!");
    }
  };

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitDetails, setLimitDetails] = useState<any>(null);
  const [isUpgradingPlan, setIsUpgradingPlan] = useState(false);

  const handleDownload = async () => {
    if (!user) {
      showToast("Please sign in to download videos.");
      return;
    }
    if (downloadState === "loading") return;
    setDownloadState("loading");

    try {
      // 1. Check & track daily quota with backend
      await axiosInstance.post("/download/track", {
        userId: user._id,
        videoId: video._id,
      });

      // 2. Perform video file stream download
      const response = await fetch(videoSrc);
      if (!response.ok) {
        window.open(videoSrc, "_blank");
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        
        const cleanTitle = (video.videotitle || "video")
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        a.download = `${cleanTitle}.mp4`;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        a.remove();
      }

      setDownloadState("success");
      showToast("Video downloaded & added to your Downloads!");
      setTimeout(() => setDownloadState("idle"), 3000);
    } catch (err: any) {
      setDownloadState("idle");
      if (err.response?.status === 403 && err.response?.data?.limitReached) {
        setLimitDetails(err.response.data);
        setShowLimitModal(true);
      } else {
        console.error("Download error:", err);
        showToast("Could not download video. Please try again.");
      }
    }
  };

  const handleUpgradePlan = async () => {
    if (!user) return;
    try {
      setIsUpgradingPlan(true);
      await axiosInstance.patch("/download/plan", {
        userId: user._id,
        plan: "Premium",
      });
      setShowLimitModal(false);
      showToast("🎉 Upgraded to Premium! Enjoy 10 daily downloads!");
    } catch (err) {
      console.error("Upgrade error:", err);
      showToast("Failed to upgrade plan.");
    } finally {
      setIsUpgradingPlan(false);
    }
  };

  return (
    <div className="space-y-4 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-xl font-bold">{video.videotitle}</h1>

      <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between border-b border-gray-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center justify-between w-full xl:w-auto shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link href={`/channel/${video.uploader}`} className="flex items-center gap-3 hover:opacity-80 transition-all cursor-pointer shrink-0">
              <Avatar className="w-10 h-10 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs">
                <AvatarFallback className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm border border-zinc-300/50 dark:border-zinc-700/50">
                  {((user && user._id === video.uploader ? (user.channelname || video.videochanel) : video.videochanel) || "V")?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="shrink-0">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-sm sm:text-base">
                  {user && user._id === video.uploader ? (user.channelname || video.videochanel) : video.videochanel}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">1.2M subscribers</p>
              </div>
            </Link>
            {user && user._id === video.uploader ? (
              <span className="ml-2 sm:ml-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                Owner
              </span>
            ) : (
              <Button
                onClick={handleSubscribe}
                className={`ml-2 sm:ml-3 rounded-full transition-all duration-200 cursor-pointer min-w-[96px] h-8 text-xs shrink-0 text-center flex items-center justify-center ${
                  isSubscribed
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-medium"
                    : "bg-red-600 text-white hover:bg-red-700 font-semibold"
                }`}
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full xl:w-auto shrink-0 py-0.5 max-w-full">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full shrink-0 text-zinc-900 dark:text-zinc-100 h-8">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer h-8 px-2.5 text-xs"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-3.5 h-3.5 mr-1.5 ${
                  isLiked ? "fill-zinc-800 text-zinc-800 dark:fill-zinc-200 dark:text-zinc-200" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer h-8 px-2.5 text-xs"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-3.5 h-3.5 mr-1.5 ${
                  isDisliked ? "fill-zinc-800 text-zinc-800 dark:fill-zinc-200 dark:text-zinc-200" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full shrink-0 cursor-pointer min-w-[105px] h-8 text-xs px-3 text-center flex items-center justify-center transition-colors ${
              isWatchLater ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full shrink-0 cursor-pointer h-8 text-xs px-3"
            onClick={handleShare}
          >
            <Share className="w-3.5 h-3.5 mr-1.5" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full shrink-0 transition-all duration-300 cursor-pointer min-w-[95px] h-8 text-xs px-3 text-center flex items-center justify-center ${
              downloadState === "success" ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 hover:bg-green-200" : ""
            }`}
            onClick={handleDownload}
            disabled={downloadState === "loading"}
          >
            {downloadState === "idle" && (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </>
            )}
            {downloadState === "loading" && (
              <>
                <span className="w-3.5 h-3.5 mr-1.5 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin" />
                Downloading...
              </>
            )}
            {downloadState === "success" && (
              <>
                <span className="mr-1.5 animate-bounce">🎉</span>
                Saved!
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 transition-colors">
        <div className="flex gap-4 text-sm font-semibold mb-2 text-zinc-800 dark:text-zinc-200">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            {video.videodescription || "No description provided."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-bold text-zinc-900 dark:text-white hover:underline cursor-pointer"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
      
      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-zinc-900/90 backdrop-blur text-white text-sm px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Daily Download Limit Exceeded Modal (Fully Light & Dark Mode Compliant) */}
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

            {/* Quota Usage Meter */}
            <div className="w-full bg-gray-100 dark:bg-zinc-800/80 rounded-2xl p-4 mb-6 border border-gray-200/60 dark:border-zinc-700/60">
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Current Plan: {limitDetails?.userPlan || "Free"}</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{limitDetails?.currentCount || 1} / {limitDetails?.maxAllowed || 1} Used</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full w-full" />
              </div>
            </div>

            {/* Tier Perks Breakdown */}
            <div className="w-full space-y-2 mb-6 text-left text-xs bg-amber-50/50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 mb-1">
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Available Subscription Upgrades</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                • <strong>Bronze (₹99)</strong>: 5 Video Downloads / day
              </p>
              <p className="text-amber-800 dark:text-amber-300">
                • <strong>Silver (₹199)</strong>: 15 Downloads / day + Full Ad-Free
              </p>
              <p className="text-amber-800 dark:text-amber-300">
                • <strong>Gold (₹499)</strong>: 50 Downloads / day + VIP Access
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-semibold border-gray-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 text-xs"
                onClick={() => setShowLimitModal(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md flex items-center justify-center gap-1.5 text-xs"
                onClick={() => {
                  setShowLimitModal(false);
                  router.push("/membership");
                }}
              >
                <Sparkles className="w-4 h-4" />
                View Plans & Upgrade
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoInfo;
