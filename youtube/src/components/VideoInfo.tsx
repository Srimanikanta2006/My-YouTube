import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Check,
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
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [dislikeAnimating, setDislikeAnimating] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isShareCopied, setIsShareCopied] = useState(false);

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
      // Load Dislike state from localStorage without mutating count
      const dislikedVids = JSON.parse(localStorage.getItem("dislikedVideos") || "[]");
      const currentDisliked = dislikedVids.includes(video._id);
      setIsDisliked(currentDisliked);

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

  const [subscriberCount, setSubscriberCount] = useState<number>(0);

  useEffect(() => {
    if (!video?._id) return;
    const fetchReactionStatus = async () => {
      if (!user?._id) return;
      try {
        const res = await axiosInstance.get(`/like/status/${video._id}/${user._id}`);
        if (res.data) {
          setIsLiked(res.data.liked);
          setIsDisliked(res.data.disliked);
        }
      } catch (err) {}
    };
    fetchReactionStatus();

    if (video?.uploader) {
      axiosInstance
        .get(`/user/${video.uploader}`)
        .then((res) => {
          if (res.data?.subscribers && Array.isArray(res.data.subscribers)) {
            setSubscriberCount(res.data.subscribers.length);
          } else {
            const subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
            const count = subscribedChannels.includes(video.videochanel) ? 1 : 0;
            setSubscriberCount(count);
          }
        })
        .catch(() => {
          const subscribedChannels = JSON.parse(localStorage.getItem("subscribedChannels") || "[]");
          const count = subscribedChannels.includes(video.videochanel) ? 1 : 0;
          setSubscriberCount(count);
        });
    }
  }, [user?._id, video?._id, video?.uploader, video?.videochanel]);

  const handleLike = async () => {
    if (!user) {
      alert("Please sign in to like videos.");
      return;
    }

    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 250);

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
      if (res.data) {
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
      alert("Please sign in to save videos to Watch Later.");
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
      alert("Please sign in to dislike videos.");
      return;
    }

    setDislikeAnimating(true);
    setTimeout(() => setDislikeAnimating(false), 250);

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
      if (res.data) {
        setIsLiked(Boolean(res.data.liked));
        setIsDisliked(Boolean(res.data.disliked));
        if (typeof res.data.likes === "number") setlikes(res.data.likes);
        if (typeof res.data.dislikes === "number") setDislikes(res.data.dislikes);
      }
    } catch (error) {
      console.error("Error toggling dislike:", error);
    }
  };

  const handleSubscribe = () => {
    if (!user) {
      alert("Please sign in to subscribe to channels.");
      return;
    }
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
        setSubscriberCount((prev) => Math.max(0, prev - 1));
      } else {
        if (name && !subscribedChannels.includes(name)) subscribedChannels.push(name);
        if (uploaderId && !subscribedChannels.includes(uploaderId)) subscribedChannels.push(uploaderId);
        setIsSubscribed(true);
        setSubscriberCount((prev) => prev + 1);
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
    
    let relativePath = video.filepath.replace(/\\/g, "/");
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.slice(1);
    }
    
    const backendUrl = getBackendUrl();
    const cleanBackendUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    
    return `${cleanBackendUrl}/${relativePath}`;
  };

  const videoSrc = getCleanVideoSrc();

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setIsShareCopied(true);
      showToast("Link copied to clipboard!");
      setTimeout(() => setIsShareCopied(false), 2000);
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
    setDownloadProgress(15);

    const progressTimer = setInterval(() => {
      setDownloadProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 150);

    try {
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
        
        const cleanTitle = (video.videotitle || "video")
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
        setTimeout(() => {
          setDownloadState("idle");
          setDownloadProgress(0);
        }, 3500);
      }, 300);
    } catch (err: any) {
      clearInterval(progressTimer);
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

  return (
    <div className="space-y-3 sm:space-y-4 px-3 sm:px-0 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight leading-snug">{video.videotitle}</h1>

      {/* Dynamic Responsive Meta Row (Drops all 4 action buttons together below channel info on screens under 1280px / 110% zoom) */}
      <div className="flex flex-col min-[1280px]:flex-row min-[1280px]:items-center justify-between gap-3 sm:gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4">
        {/* Left Section: Channel Info & Subscribe Button */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-nowrap">
          <Link href={`/channel/${video.uploader}`} className="flex items-center gap-3 hover:opacity-80 transition-all cursor-pointer shrink-0">
            <Avatar className="w-10 h-10 border border-zinc-200/60 dark:border-zinc-700/60 shadow-xs">
              <AvatarFallback className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm border border-zinc-300/50 dark:border-zinc-700/50">
                {((user && isVideoOwner ? (user.channelname || video.videochanel) : video.videochanel) || "V")?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="shrink-0">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-sm sm:text-base whitespace-nowrap">
                {user && isVideoOwner ? (user.channelname || video.videochanel) : video.videochanel}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                {subscriberCount} {subscriberCount === 1 ? "subscriber" : "subscribers"}
              </p>
            </div>
          </Link>

          {!isVideoOwner && (
            <Button
              onClick={handleSubscribe}
              className={`rounded-full transition-all duration-200 cursor-pointer min-w-[96px] h-9 text-xs shrink-0 text-center flex items-center justify-center whitespace-nowrap ${
                isSubscribed
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-medium"
                  : "bg-red-600 text-white hover:bg-red-700 font-bold"
              }`}
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </Button>
          )}
        </div>

        {/* Right Section: All 4 Action Buttons Grouped Together (Drops to line 2 on screens under 1280px to prevent 110% zoom clipping) */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0 overflow-x-auto scrollbar-none py-0.5 max-w-full">
          {/* Merged Like / Dislike Pill Button */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full shrink-0 text-zinc-900 dark:text-zinc-100 h-9 md:h-10 border border-zinc-200/60 dark:border-zinc-700/60 overflow-hidden shadow-xs">
            <button
              className="rounded-l-full hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer h-9 md:h-10 px-3 sm:px-3.5 text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all select-none whitespace-nowrap"
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
              className="rounded-r-full hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer h-9 md:h-10 px-3 sm:px-3.5 text-xs md:text-sm font-semibold flex items-center gap-1.5 transition-all select-none whitespace-nowrap"
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

          {/* Watch Later / Save Button with Zero Layout Shift */}
          <button
            className={`min-w-[40px] sm:min-w-[110px] md:min-w-[125px] flex items-center justify-center gap-1.5 h-9 md:h-10 px-2.5 sm:px-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full font-semibold text-xs md:text-sm shrink-0 cursor-pointer transition-all select-none whitespace-nowrap ${
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

          {/* Share Button with Icon Swap Feedback */}
          <button
            className="min-w-[40px] sm:min-w-[80px] md:min-w-[90px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full shrink-0 cursor-pointer h-9 md:h-10 text-xs md:text-sm px-2.5 sm:px-3.5 font-semibold flex items-center justify-center gap-1.5 transition-all select-none whitespace-nowrap"
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

          {/* Download Button with SVG Circular Progress Ring & Scale-Bounce Checkmark */}
          <button
            className={`bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full shrink-0 transition-all duration-300 cursor-pointer min-w-[40px] sm:min-w-[110px] md:min-w-[125px] h-9 md:h-10 text-xs md:text-sm px-2.5 sm:px-3.5 font-semibold text-center flex items-center justify-center select-none whitespace-nowrap ${
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
                {/* SVG Progress Ring */}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold px-5 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2.5 border border-zinc-800 dark:border-zinc-200 backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-200">
          <Check className="w-4 h-4 text-green-400 dark:text-green-600 shrink-0" />
          <span>{toastMessage}</span>
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
