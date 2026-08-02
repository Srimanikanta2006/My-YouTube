import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getBackendUrl } from "../lib/urlHelper";
import { Crown } from "lucide-react";

interface RelatedVideosProps {
  videos: Array<any>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  const backendUrl = getBackendUrl();

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {videos.map((video) => {
        const normalizedPath = video.filepath ? video.filepath.replace(/\\/g, "/") : "";
        const videoSrcBase = normalizedPath.startsWith("http") ? normalizedPath : `${backendUrl}/${normalizedPath}`;
        let videoSrc = videoSrcBase ? `${videoSrcBase}#t=0.1` : "";
        if (typeof window !== "undefined" && window.location.protocol === "https:") {
          videoSrc = videoSrc.replace(/^http:/, "https:");
        }

        const channelDisplayName = video?.videochanel || "Channel";

        return (
          <Link
            key={video._id}
            href={`/watch/${video._id}`}
            className="group block w-full p-1 sm:p-1.5 rounded-2xl hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 transition-all duration-200"
          >
            {/* Main Flex Wrapper: Vertical on mobile (< md), Horizontal side-by-side on desktop (>= md) */}
            <div className="flex flex-col md:flex-row gap-2.5 md:gap-3 items-start w-full">
              
              {/* Video Thumbnail Box */}
              <div className="relative aspect-video w-full md:w-44 xl:w-48 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 shadow-xs border border-zinc-200/50 dark:border-zinc-800/80">
                <video
                  src={videoSrc}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                {video?.isPremium && (
                  <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white font-black text-[9px] uppercase px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 z-10">
                    <Crown className="w-2.5 h-2.5 text-white fill-white" />
                    <span>PREMIUM</span>
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/75 text-white font-mono text-[10px] px-1 py-0.5 rounded">
                  {video?.videoduration || "00:00"}
                </div>
              </div>

              {/* Details Section */}
              <div className="flex-1 min-w-0 w-full">
                {/* Mobile View ONLY (< md): Avatar + Title & Meta */}
                <div className="flex gap-2.5 items-start md:hidden pt-0.5">
                  <Avatar className="w-8 h-8 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-[11px]">
                      {channelDisplayName?.[0]?.toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs line-clamp-2 text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 leading-snug tracking-tight transition-colors">
                      {video.videotitle}
                    </h3>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold truncate mt-0.5">
                      {channelDisplayName}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
                      {video.views?.toLocaleString() || 0} views •{" "}
                      {video.createdAt ? formatDistanceToNow(new Date(video.createdAt)) : "recently"} ago
                    </p>
                  </div>
                </div>

                {/* Desktop View ONLY (>= md): Title on top, Channel & Meta below (NO Avatar Icon) */}
                <div className="hidden md:flex md:flex-col justify-center min-w-0 h-full py-0.5">
                  <h3 className="font-bold text-xs md:text-sm lg:text-base line-clamp-2 text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 leading-snug tracking-tight transition-colors">
                    {video.videotitle}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate mt-1">
                    {channelDisplayName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
                    {video.views?.toLocaleString() || 0} views •{" "}
                    {video.createdAt ? formatDistanceToNow(new Date(video.createdAt)) : "recently"} ago
                  </p>
                </div>

              </div>

            </div>
          </Link>
        );
      })}
    </div>
  );
}
