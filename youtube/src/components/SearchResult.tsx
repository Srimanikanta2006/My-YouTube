import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Crown, CheckCircle } from "lucide-react";
import { useRouter } from "next/router";
import axiosInstance from "../lib/axiosinstance";
import { getBackendUrl } from "../lib/urlHelper";
import { Button } from "./ui/button";

const SearchResult = () => {
  const router = useRouter();
  const { q } = router.query;
  const rawQuery = typeof q === "string" ? q : "";
  const query = rawQuery.trim().replace(/\s+/g, " ");

  const [videos, setVideos] = useState<any[]>([]);
  const [matchingChannels, setMatchingChannels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSearchResults = async () => {
    if (!query) {
      setVideos([]);
      setMatchingChannels([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await axiosInstance.get("/video/getall");
      const allVideos = Array.isArray(res.data) ? res.data : [];
      const qLower = query.toLowerCase();

      // Filter matching videos across multi-fields safely
      const matchedVids = allVideos.filter((vid: any) => {
        const titleMatch = vid.videotitle && vid.videotitle.toLowerCase().includes(qLower);
        const channelMatch = vid.videochanel && vid.videochanel.toLowerCase().includes(qLower);
        const uploaderMatch = vid.uploaderName && vid.uploaderName.toLowerCase().includes(qLower);
        const descMatch = vid.description && vid.description.toLowerCase().includes(qLower);
        const tagsMatch = vid.tags && Array.isArray(vid.tags) && vid.tags.some((t: string) => t.toLowerCase().includes(qLower));

        return titleMatch || channelMatch || uploaderMatch || descMatch || tagsMatch;
      });

      // Extract matching unique channels
      const channelMap = new Map<string, any>();
      allVideos.forEach((vid: any) => {
        const cName = vid.videochanel || vid.uploaderName;
        if (cName && cName.toLowerCase().includes(qLower)) {
          if (!channelMap.has(cName.toLowerCase())) {
            channelMap.set(cName.toLowerCase(), {
              id: vid.uploader || vid._id,
              name: cName,
              image: vid.uploaderImage || "",
            });
          }
        }
      });

      setVideos(matchedVids);
      setMatchingChannels(Array.from(channelMap.values()));
    } catch (error) {
      console.error("Error searching videos:", error);
      setVideos([]);
      setMatchingChannels([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady) {
      fetchSearchResults();
    }
    const handleListChange = () => {
      if (router.isReady) fetchSearchResults();
    };
    window.addEventListener("video-list-changed", handleListChange);
    return () => window.removeEventListener("video-list-changed", handleListChange);
  }, [query, router.isReady]);

  if (!router.isReady || isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-zinc-500 dark:text-zinc-400">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Searching YouTube...</p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center py-20 text-zinc-900 dark:text-zinc-100 max-w-md mx-auto">
        <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
          Type keywords or search terms above to discover videos and channels.
        </p>
      </div>
    );
  }

  if (videos.length === 0 && matchingChannels.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-900 dark:text-zinc-100 max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
          <Search className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            No results found for "{query}"
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Try different keywords, check for typos, or search for channel names.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-zinc-900 dark:text-zinc-100 max-w-5xl mx-auto pb-12">
      {/* 1. Top Channel Result Cards */}
      {matchingChannels.length > 0 && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Matching Channels
          </h3>
          {matchingChannels.map((chan) => (
            <Link
              key={chan.name}
              href={`/channel/${chan.id}`}
              className="flex items-center gap-6 p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
            >
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-zinc-200 dark:border-zinc-800 shadow-md">
                <AvatarImage src={chan.image} />
                <AvatarFallback className="bg-red-600 text-white font-bold text-2xl">
                  {chan.name?.[0]?.toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors truncate">
                    {chan.name}
                  </h2>
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500" />
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  @{chan.name.toLowerCase().replace(/\s+/g, "")} • Channel
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">
                  Official channel and video content on My YouTube.
                </p>
              </div>
              <Button className="hidden sm:flex bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-5 py-2 text-xs shadow-md">
                View Channel
              </Button>
            </Link>
          ))}
        </div>
      )}

      {/* 2. Video Results List */}
      {videos.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Matching Videos ({videos.length})
            </h3>
          </div>
          <div className="space-y-5">
            {videos.map((vid: any) => (
              <SearchVideoRow key={vid._id} video={vid} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function SearchVideoRow({ video }: { video: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const backendUrl = getBackendUrl();
  const normalizedPath = video?.filepath ? video.filepath.replace(/\\/g, "/") : "";
  const videoSrcBase = normalizedPath.startsWith("http") ? normalizedPath : `${backendUrl}/${normalizedPath}`;
  let videoSrc = videoSrcBase ? `${videoSrcBase}#t=0.1` : "";
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    videoSrc = videoSrc.replace(/^http:/, "https:");
  }

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
  };

  return (
    <Link
      href={`/watch/${video._id}`}
      className="flex flex-col sm:flex-row gap-4 p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Thumbnail Box */}
      <div className="relative aspect-video w-full sm:w-80 rounded-xl overflow-hidden bg-black shrink-0 shadow-sm border border-zinc-200/60 dark:border-zinc-800/60">
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          playsInline
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {video?.isPremium && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold text-[10px] shadow-md z-10">
            <Crown className="w-3 h-3" />
            <span>PREMIUM</span>
          </div>
        )}
      </div>

      {/* Video Details */}
      <div className="flex-1 space-y-2 min-w-0 py-0.5">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors line-clamp-2 leading-snug">
          {video.videotitle}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          {video.views || 0} views • {video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : "Recently"}
        </p>

        {/* Uploader Channel Info */}
        <div className="flex items-center gap-2.5 py-1">
          <Avatar className="w-6 h-6 border border-zinc-200 dark:border-zinc-800">
            <AvatarImage src={video.uploaderImage || ""} />
            <AvatarFallback className="bg-zinc-800 text-white font-bold text-[10px]">
              {(video.videochanel || video.uploaderName || "C")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate hover:underline">
            {video.videochanel || video.uploaderName || "Channel"}
          </span>
        </div>

        {/* Description Snippet */}
        {video.description && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed pt-0.5 hidden sm:block">
            {video.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export default SearchResult;
