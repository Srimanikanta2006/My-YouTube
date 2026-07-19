"use client";
import React, { useEffect, useState } from "react";
import Videocard from "./Videocard";
import axiosInstance from "../lib/axiosinstance";
import { getWsUrl } from "../lib/urlHelper";

const categoryKeywords: { [key: string]: string[] } = {
  Music: ["music", "song", "audio", "sing", "concert", "dj", "remix", "beat", "instrumental", "melody", "lofi", "pop", "rock", "jazz", "rap"],
  Gaming: ["gaming", "game", "play", "xbox", "ps5", "nintendo", "pc", "gameplay", "walkthrough", "stream", "minecraft", "fortnite", "pubg", "sintel"],
  Movies: ["movie", "film", "short", "teaser", "trailer", "cinema", "animation", "bunny", "sintel", "steel", "dream", "series", "season"],
  News: ["news", "update", "today", "breaking", "politics", "world", "report", "journal", "current"],
  Sports: ["sports", "game", "match", "highlights", "football", "soccer", "basketball", "cricket", "tennis", "athlete", "run", "fitness"],
  Technology: ["technology", "tech", "code", "programming", "developer", "review", "iphone", "android", "software", "hardware", "ai", "web", "steel"],
  Comedy: ["comedy", "funny", "laugh", "meme", "joke", "prank", "parody", "bunny"],
  Education: ["education", "learn", "how to", "tutorial", "course", "lecture", "explain", "study", "guide"],
  Science: ["science", "physics", "chemistry", "space", "biology", "dream", "research", "lab", "nasa", "earth"],
  Travel: ["travel", "vlog", "trip", "visit", "explore", "tour", "destination", "nature", "world"],
  Food: ["food", "cooking", "recipe", "chef", "cook", "kitchen", "bake", "taste", "delicious", "restaurant"],
  Fashion: ["fashion", "style", "outfit", "makeup", "clothing", "wear", "beauty", "haul", "runway"]
};

interface VideogridProps {
  selectedCategory?: string;
}

const Videogrid = ({ selectedCategory = "All" }: VideogridProps) => {
  const [videos, setvideo] = useState([]);
  const [loading, setloading] = useState(true);
  
  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setvideo(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();

    // Establish WebSocket listener to refresh video list when a new video is uploaded
    const wsUrl = getWsUrl();
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "global-video-uploaded") {
              console.log("WebSocket event: new video uploaded, fetching updated list...");
              fetchvideo();
            }
          } catch (err) {
            // Ignore format errors
          }
        };
        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 5000);
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    };

    connectWs();

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const filteredVideos = selectedCategory === "All"
    ? videos
    : videos.filter((video: any) => {
        // 1. Direct database category match
        if (video.videocategory && video.videocategory !== "All") {
          return video.videocategory.toLowerCase() === selectedCategory.toLowerCase();
        }

        // 2. Fallback title keyword matching for older records
        const titleLower = (video.videotitle || "").toLowerCase();
        const categoryLower = selectedCategory.toLowerCase();
        if (titleLower.includes(categoryLower)) return true;
        
        const keywords = categoryKeywords[selectedCategory];
        if (keywords && keywords.some(kw => titleLower.includes(kw))) {
          return true;
        }
        
        return false;
      });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {loading ? (
        <div className="col-span-full text-center py-12 text-gray-500 animate-pulse">
          Loading videos...
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="col-span-full text-center py-12 text-gray-500 font-medium">
          No videos found in the "{selectedCategory}" category.
        </div>
      ) : (
        filteredVideos.map((video: any) => <Videocard key={video._id} video={video} />)
      )}
    </div>
  );
};

export default Videogrid;
