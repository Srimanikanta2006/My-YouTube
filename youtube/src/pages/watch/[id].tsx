import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import VideoPlayer from "@/components/Videoplayer";
import VideoInfo from "@/components/VideoInfo";
import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import Advertisement from "@/components/Advertisement";
import axiosInstance from "@/lib/axiosinstance";

import { Crown, Sparkles } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

export default function WatchPage() {
  const router = useRouter();
  const { user, handlegooglesignin } = useUser();
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

  const isPremiumLocked = video?.isPremium && (!user || user.plan === "Free");

  return (
    <div className="max-w-[1700px] mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left main content: Video Player, Info, Comments */}
        <div className="flex-1 lg:max-w-[72%] space-y-6">
          {isPremiumLocked ? (
            <div className="aspect-video w-full bg-gradient-to-br from-zinc-900 via-gray-900 to-black rounded-2xl flex flex-col items-center justify-center p-6 text-center text-white relative border border-zinc-800 shadow-2xl overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mb-4 animate-bounce">
                <Crown className="w-8 h-8" />
              </div>

              <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight text-white">
                Premium Exclusive Video
              </h2>

              {!user ? (
                <>
                  <p className="text-xs md:text-sm text-gray-300 max-w-md mb-6 leading-relaxed">
                    This video is premium exclusive. Please sign in to your account to watch or upgrade your plan.
                  </p>

                  <button
                    onClick={handlegooglesignin}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Sign In to Watch
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs md:text-sm text-gray-300 max-w-md mb-6 leading-relaxed">
                    This content is restricted to Bronze, Silver, and Gold members. Upgrade your plan today to unlock instant ad-free viewing and offline downloads!
                  </p>

                  <button
                    onClick={() => router.push("/membership")}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Upgrade Membership (Starting at ₹99)
                  </button>
                </>
              )}
            </div>
          ) : (
            <VideoPlayer video={video} />
          )}
          <VideoInfo video={video} />
          <Advertisement />
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
