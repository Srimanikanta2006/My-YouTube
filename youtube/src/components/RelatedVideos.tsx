import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getBackendUrl } from "../lib/urlHelper";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    filepath: string;
    views: number;
    createdAt: string;
  }>;
}
export default function RelatedVideos({ videos }: RelatedVideosProps) {
  const backendUrl = getBackendUrl();

  return (
    <div className="space-y-3">
      {videos.map((video) => {
        const normalizedPath = video.filepath ? video.filepath.replace(/\\/g, "/") : "";
        const videoSrcBase = normalizedPath.startsWith("http") ? normalizedPath : `${backendUrl}/${normalizedPath}`;
        let videoSrc = videoSrcBase ? `${videoSrcBase}#t=0.1` : "";
        if (typeof window !== "undefined" && window.location.protocol === "https:") {
          videoSrc = videoSrc.replace(/^http:/, "https:");
        }
        return (
          <Link
            key={video._id}
            href={`/watch/${video._id}`}
            className="flex gap-2 group p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <div className="relative w-40 aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
              <video
                src={videoSrc}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs md:text-sm line-clamp-2 text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 leading-tight transition-colors">
                {video.videotitle}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">{video.videochanel}</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {video.views.toLocaleString()} views •{" "}
                {formatDistanceToNow(new Date(video.createdAt))} ago
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
