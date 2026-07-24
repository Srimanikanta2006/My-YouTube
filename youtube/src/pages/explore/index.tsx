import React, { useEffect, useState } from "react";
import { Compass, Flame, Gamepad2, Music, Newspaper } from "lucide-react";
import VideoCard from "@/components/Videocard";
import axiosInstance from "@/lib/axiosinstance";

const exploreCategories = [
  { id: "trending", name: "Trending", icon: Flame, color: "bg-red-100 text-red-600" },
  { id: "music", name: "Music", icon: Music, color: "bg-blue-100 text-blue-600" },
  { id: "gaming", name: "Gaming", icon: Gamepad2, color: "bg-green-100 text-green-600" },
  { id: "news", name: "News", icon: Newspaper, color: "bg-purple-100 text-purple-600" },
];

const categoryKeywords: { [key: string]: string[] } = {
  Music: ["music", "song", "audio", "sing", "concert", "dj", "remix", "beat", "instrumental", "melody", "lofi", "pop", "rock", "jazz", "rap"],
  Gaming: ["gaming", "game", "play", "xbox", "ps5", "nintendo", "pc", "gameplay", "walkthrough", "stream", "minecraft", "fortnite", "pubg", "sintel"],
  News: ["news", "update", "today", "breaking", "politics", "world", "report", "journal", "current"],
};

const idToCategoryMap: { [key: string]: string } = {
  music: "Music",
  gaming: "Gaming",
  news: "News",
};

export default function ExplorePage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("trending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setVideos(res.data);
        // Initially show all videos sorted by views descending (Trending)
        const sorted = [...res.data].sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
        setFilteredVideos(sorted);
      } catch (error) {
        console.error("Error fetching explore videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();

    const handleListChange = () => {
      fetchVideos();
    };
    window.addEventListener("video-list-changed", handleListChange);
    return () => window.removeEventListener("video-list-changed", handleListChange);
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    if (categoryId === "trending") {
      const sorted = [...videos].sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
      setFilteredVideos(sorted);
    } else {
      const mappedCategoryName = idToCategoryMap[categoryId];
      if (!mappedCategoryName) {
        setFilteredVideos([]);
        return;
      }
      
      const filtered = videos.filter((video: any) => {
        // 1. Direct database category match
        if (video.videocategory && video.videocategory !== "All") {
          return video.videocategory.toLowerCase() === mappedCategoryName.toLowerCase();
        }

        // 2. Fallback title keyword matching for older records
        const titleLower = (video.videotitle || "").toLowerCase();
        const categoryLower = mappedCategoryName.toLowerCase();
        if (titleLower.includes(categoryLower)) return true;
        
        const keywords = categoryKeywords[mappedCategoryName];
        if (keywords && keywords.some(kw => titleLower.includes(kw))) {
          return true;
        }
        
        return false;
      });
      setFilteredVideos(filtered);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-8 text-zinc-900 dark:text-zinc-100">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-zinc-800 pb-4">
        <Compass className="w-8 h-8 text-red-600 dark:text-red-500" />
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Explore</h1>
      </div>

      {/* Explore Categories Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {exploreCategories.map((cat) => {
          const IconComponent = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${
                isActive
                  ? "border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/30 ring-2 ring-red-500"
                  : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
            >
              <div className={`p-3 rounded-full ${cat.color} mb-3`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Videos Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold capitalize text-zinc-900 dark:text-zinc-100">
          {activeCategory} Videos
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">No videos found in this category.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Upload a video with matching keywords to see it here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
