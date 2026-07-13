import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import VideoPlayer from "@/components/Videoplayer";
import VideoInfo from "@/components/VideoInfo";
import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import axiosInstance from "@/lib/axiosinstance";

export default function WatchPage() {
  const router = useRouter();
  const { id } = router.query;

  const [video, setVideo] = useState<any>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchVideoData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch current video
        const videoRes = await axiosInstance.get(`/video/get/${id}`);
        setVideo(videoRes.data);

        // Fetch all videos for related section
        const allRes = await axiosInstance.get("/video/getall");
        const filtered = allRes.data.filter((v: any) => v._id !== id);
        setRelatedVideos(filtered);
      } catch (err: any) {
        console.error("Error fetching watch page data:", err);
        setError(err.response?.data?.message || "Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [id, router.isReady]);

  if (!router.isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg font-medium text-gray-600 animate-pulse">
          Loading video...
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Video not found</h2>
        <p className="text-gray-600">{error || "The video you are trying to watch does not exist."}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1700px] mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left main content: Video Player, Info, Comments */}
        <div className="flex-1 lg:max-w-[72%] space-y-6">
          <VideoPlayer video={video} />
          <VideoInfo video={video} />
          <div className="border-t pt-6">
            <Comments videoId={video._id} />
          </div>
        </div>

        {/* Right sidebar: Related Videos */}
        <div className="w-full lg:w-[28%] space-y-4">
          <h2 className="text-lg font-semibold">Up Next</h2>
          {relatedVideos.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No other videos available.</p>
          ) : (
            <RelatedVideos videos={relatedVideos} />
          )}
        </div>
      </div>
    </div>
  );
}
