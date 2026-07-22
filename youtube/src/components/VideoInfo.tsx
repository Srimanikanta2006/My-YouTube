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

  useEffect(() => {
    if (!video?._id) return;
    const handleviews = async () => {
      try {
        if (user) {
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
      if (isSubscribed) {
        subscribedChannels = subscribedChannels.filter((c: string) => c !== video.videochanel);
        setIsSubscribed(false);
      } else {
        subscribedChannels.push(video.videochanel);
        setIsSubscribed(true);
      }
      localStorage.setItem("subscribedChannels", JSON.stringify(subscribedChannels));
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-4">
            <Link href={`/channel/${video.uploader}`} className="flex items-center gap-3 hover:opacity-80 transition-all cursor-pointer">
              <Avatar className="w-10 h-10">
                <AvatarFallback>{video.videochanel?.[0] || "V"}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium hover:text-red-600 transition-colors">{video.videochanel}</h3>
                <p className="text-sm text-gray-600">1.2M subscribers</p>
              </div>
            </Link>
            {user && user._id === video.uploader ? (
              <span className="ml-4 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full uppercase tracking-wider">
                Owner
              </span>
            ) : (
              <Button
                onClick={handleSubscribe}
                className={`ml-4 rounded-full transition-all duration-300 ${
                  isSubscribed
                    ? "bg-gray-200 text-black hover:bg-gray-300 font-medium"
                    : "bg-red-600 text-white hover:bg-red-700 font-semibold"
                }`}
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full md:overflow-x-visible md:pb-0 md:w-auto flex-shrink-0">
          <div className="flex items-center bg-gray-100 rounded-full flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full flex-shrink-0 ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full flex-shrink-0"
            onClick={handleShare}
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full flex-shrink-0 transition-all duration-300 ${
              downloadState === "success" ? "bg-green-100 text-green-800 hover:bg-green-150" : ""
            }`}
            onClick={handleDownload}
            disabled={downloadState === "loading"}
          >
            {downloadState === "idle" && (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download
              </>
            )}
            {downloadState === "loading" && (
              <>
                <span className="w-4 h-4 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Downloading...
              </>
            )}
            {downloadState === "success" && (
              <>
                <span className="mr-2 animate-bounce">🎉</span>
                Saved!
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full flex-shrink-0"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
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

      {/* Daily Download Limit Exceeded Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Daily Download Limit Reached
            </h3>
            
            <p className="text-sm text-gray-600 mb-4 px-2">
              {limitDetails?.message || `Daily download limit reached for your ${limitDetails?.userPlan || "Free"} plan (${limitDetails?.currentCount || 1}/${limitDetails?.maxAllowed || 1}). Upgrade to Bronze, Silver, or Gold to download more videos!`}
            </p>

            {/* Quota Usage Meter */}
            <div className="w-full bg-gray-100 rounded-2xl p-4 mb-6 border border-gray-200/60">
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-gray-500 uppercase tracking-wider">Current Plan: {limitDetails?.userPlan || "Free"}</span>
                <span className="text-amber-600 font-bold">{limitDetails?.currentCount || 1} / {limitDetails?.maxAllowed || 1} Used</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full w-full" />
              </div>
            </div>

            {/* Tier Perks Breakdown */}
            <div className="w-full space-y-2 mb-6 text-left text-xs bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/50">
              <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                <Crown className="w-4 h-4 text-amber-600" />
                <span>Available Subscription Upgrades</span>
              </div>
              <p className="text-amber-800">
                • <strong>Bronze (₹99)</strong>: 5 Video Downloads / day
              </p>
              <p className="text-amber-800">
                • <strong>Silver (₹199)</strong>: 15 Downloads / day + Full Ad-Free
              </p>
              <p className="text-amber-800">
                • <strong>Gold (₹499)</strong>: 50 Downloads / day + VIP Access
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-semibold border-gray-300 text-xs"
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
