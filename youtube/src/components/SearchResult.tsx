import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/router";
import axiosInstance from "../lib/axiosinstance";

import { getBackendUrl } from "../lib/urlHelper";

const SearchResult = () => {
  const router = useRouter();
  const { q } = router.query;
  const query = typeof q === "string" ? q : "";

  const [video, setvideos] = useState<any>(null);

  const fetchSearchVideos = async () => {
    if (!query.trim()) {
      setvideos([]);
      return;
    }
    try {
      const res = await axiosInstance.get("/video/getall");
      const allVideos = res.data;
      const results = allVideos.filter(
        (vid: any) =>
          vid.videotitle.toLowerCase().includes(query.toLowerCase()) ||
          vid.videochanel.toLowerCase().includes(query.toLowerCase())
      );
      setvideos(results);
    } catch (error) {
      console.error("Error searching videos:", error);
      setvideos([]);
    }
  };

  useEffect(() => {
    if (router.isReady) {
      fetchSearchVideos();
    }
  }, [query, router.isReady]);

  if (!router.isReady) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }
  if (!video) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  const hasResults = video ? video.length > 0 : true;
  if (!hasResults) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Video Results */}
      {video.length > 0 && (
        <div className="space-y-6">
          {video.map((vid: any) => (
            <SearchVideoRow key={vid._id} video={vid} />
          ))}
        </div>
      )}

      {/* Load More Results */}
      {hasResults && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            Showing {video.length} results for "{query}"
          </p>
        </div>
      )}
    </div>
  );
};

// Sub-component to manage separate hover preview states for search row elements
function SearchVideoRow({ video }: { video: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const backendUrl = getBackendUrl();
  const normalizedPath = video?.filepath ? video.filepath.replace(/\\/g, "/") : "";
  const videoSrcBase = normalizedPath.startsWith("http") ? normalizedPath : `${backendUrl}/${normalizedPath}`;
  const videoSrc = videoSrcBase ? `${videoSrcBase}#t=0.1` : "";

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
  };

  return (
    <div className="flex gap-6 group flex-col md:flex-row border-b pb-6 border-gray-100 last:border-0 last:pb-0">
      <Link href={`/watch/${video._id}`} className="flex-shrink-0">
        <div className="relative w-full md:w-80 aspect-video bg-gray-150 rounded-xl overflow-hidden shadow-sm">
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            playsInline
            preload="metadata"
            className="object-cover w-full h-full group-hover:scale-102 transition-transform duration-200"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            {video.videoduration || "00:00"}
          </div>
        </div>
      </Link>

      <div className="flex-1 min-w-0 py-1 space-y-2">
        <Link href={`/watch/${video._id}`}>
          <h3 className="font-bold text-lg text-gray-900 line-clamp-2 hover:text-red-600 transition-colors leading-snug">
            {video.videotitle}
          </h3>
        </Link>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{video.views?.toLocaleString() || 0} views</span>
          <span>•</span>
          <span>
            {formatDistanceToNow(new Date(video.createdAt))} ago
          </span>
        </div>

        <Link
          href={`/channel/${video.uploader}`}
          className="flex items-center gap-2 hover:text-red-600 transition-colors"
        >
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-xs bg-gray-100 text-gray-700 font-bold border">
              {video.videochanel?.[0] || "C"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-gray-600">
            {video.videochanel}
          </span>
        </Link>

        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {video.videodescription || "No description provided."}
        </p>
      </div>
    </div>
  );
}

export default SearchResult;
