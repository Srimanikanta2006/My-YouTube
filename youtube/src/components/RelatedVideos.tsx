import Link from "next/link";
import Image from "next/image";
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
    <div className="space-y-2">
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
            className="flex gap-2 group"
          >
            <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden flex-shrink-0">
              <video
                src={videoSrc}
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video.videotitle}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{video.videochanel}</p>
            <p className="text-xs text-gray-600">
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
