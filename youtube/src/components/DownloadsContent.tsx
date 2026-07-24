"use client";

import React, { useEffect, useState } from "react";
import { Download, Trash2, Crown, Sparkles, ShieldCheck, HardDrive, Play, ArrowUpRight } from "lucide-react";
import { useUser } from "../lib/AuthContext";
import axiosInstance from "../lib/axiosinstance";
import { Button } from "./ui/button";
import Link from "next/link";
import { getBackendUrl } from "../lib/urlHelper";

interface DownloadItem {
  _id: string;
  videoid: {
    _id: string;
    videotitle: string;
    filepath: string;
    videochanel: string;
    uploader: string;
    views: number;
    filesize?: string;
  };
  downloadedAt: string;
}

export default function DownloadsContent() {
  const { user } = useUser();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [userPlan, setUserPlan] = useState<string>("Free");
  const [downloadsToday, setDownloadsToday] = useState<number>(0);
  const [maxAllowed, setMaxAllowed] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const fetchDownloads = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/download/user/${user._id}`);
      setUserPlan(res.data.userPlan || "Free");
      setDownloadsToday(res.data.downloadsToday || 0);
      setMaxAllowed(res.data.maxAllowed || 1);
      setDownloads(res.data.downloads || []);
    } catch (err) {
      console.error("Error fetching downloads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, [user?._id]);

  const handleRemoveDownload = async (id: string) => {
    try {
      await axiosInstance.delete(`/download/delete/${id}`);
      setDownloads((prev) => prev.filter((item) => item._id !== id));
      showToast("Removed from Downloads.");
    } catch (err) {
      console.error("Error deleting download record:", err);
      showToast("Failed to remove download.");
    }
  };

  const handleSwitchPlan = async (targetPlan: "Free" | "Premium") => {
    if (!user?._id) return;
    try {
      setIsUpdatingPlan(true);
      await axiosInstance.patch("/download/plan", {
        userId: user._id,
        plan: targetPlan,
      });
      showToast(`Plan updated to ${targetPlan}!`);
      fetchDownloads();
    } catch (err) {
      console.error("Error updating plan:", err);
      showToast("Failed to update plan.");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const getCleanVideoSrc = (filepath: string) => {
    if (!filepath) return "";
    if (filepath.startsWith("http")) return filepath;
    let relativePath = filepath.replace(/\\/g, "/");
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.slice(1);
    }
    const backendUrl = getBackendUrl();
    const cleanBackendUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    return `${cleanBackendUrl}/${relativePath}`;
  };

  const handleRedownload = async (item: DownloadItem) => {
    if (!item.videoid?.filepath) return;
    const videoSrc = getCleanVideoSrc(item.videoid.filepath);
    try {
      const response = await fetch(videoSrc);
      if (!response.ok) {
        window.open(videoSrc, "_blank");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      const cleanTitle = (item.videoid.videotitle || "video")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      a.download = `${cleanTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showToast("File downloaded!");
    } catch (err) {
      window.open(videoSrc, "_blank");
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-600">
          <Download className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign in to view Downloads</h2>
        <p className="text-gray-500 max-w-sm mb-6 text-sm">
          Save your favorite videos for offline viewing and manage your daily download quota.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6 text-zinc-900 dark:text-zinc-100">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Download className="w-7 h-7 text-red-600 dark:text-red-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">Downloads Library</h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your offline downloaded videos and daily plan quota limits.
          </p>
        </div>

        {/* User Plan Badge */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-3.5 rounded-2xl shadow-sm border border-zinc-700">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{userPlan} Plan</span>
              <span className="text-[10px] font-mono font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded">
                {downloadsToday} / {maxAllowed} Used Today
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Allowed {maxAllowed} {maxAllowed === 1 ? "download" : "downloads"} / day
            </p>
          </div>
        </div>
      </div>

      {/* Plan Tier Upgrade Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-red-500/10 border border-amber-500/30 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Controlled Quota Management</span>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              {userPlan === "Free"
                ? "Upgrade to Bronze, Silver, or Gold for Up to 50 Downloads / Day!"
                : `You are currently on the ${userPlan} Plan (${maxAllowed} downloads/day)`}
            </h3>
            <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {userPlan === "Free"
                ? "Free users are restricted to 1 video download per 24 hours. Upgrade your plan anytime to unlock ad-free streaming, premium video access, and up to 50 daily downloads!"
                : "Manage or upgrade your plan anytime to unlock additional daily video download quotas and VIP platform benefits."}
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
            <Link href="/membership" className="w-full md:w-auto">
              <Button className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl px-5 shadow flex items-center gap-2 text-xs cursor-pointer">
                <Crown className="w-4 h-4" />
                <span>View & Upgrade Membership</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Downloads Grid Section */}
      <div>
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          <span>Downloaded Videos ({downloads.length})</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : downloads.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
              <Download className="w-8 h-8" />
            </div>
            <p className="font-bold text-zinc-800 dark:text-zinc-200 text-base mb-1">No Downloaded Videos</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              Browse videos and click the Download button on the watch page to save them here!
            </p>
            <Link href="/">
              <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold px-5">
                Browse Videos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {downloads.map((item) => {
              if (!item.videoid) return null;
              return (
                <div
                  key={item._id}
                  className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3 p-3">
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
                      <video
                        src={getCleanVideoSrc(item.videoid.filepath)}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <Link
                        href={`/watch/${item.videoid._id}`}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <div className="bg-red-600 p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-white" />
                        </div>
                      </Link>
                    </div>

                    <div>
                      <Link
                        href={`/watch/${item.videoid._id}`}
                        className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        {item.videoid.videotitle}
                      </Link>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                        {item.videoid.videochanel}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 font-mono">
                        <span>Downloaded: {new Date(item.downloadedAt).toLocaleDateString()}</span>
                        {item.videoid.filesize && (
                          <>
                            <span>•</span>
                            <span>{item.videoid.filesize}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="border-t border-gray-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRedownload(item)}
                      className="text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 h-8 px-3 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <Download className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      Save File
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDownload(item._id)}
                      className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 px-2.5 rounded-lg"
                      title="Remove from Downloads"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-zinc-900/90 backdrop-blur text-white text-sm px-4 py-3 rounded-lg shadow-xl z-50 flex items-center gap-2 border border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
