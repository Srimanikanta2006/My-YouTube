import { Check, Crown, FileVideo, Upload, X } from "lucide-react";
import React, { ChangeEvent, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import axiosInstance from "../lib/axiosinstance";
import { useUser } from "../lib/AuthContext";
import axios from "axios";

const VideoUploader = ({ onUploadSuccess }: any) => {
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDuration, setVideoDuration] = useState("00:00");
  const [videoCategorySelected, setVideoCategorySelected] = useState("All");
  const [isPremiumVideo, setIsPremiumVideo] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlefilechange = (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("video/")) {
        setUploadError("Please upload a valid video file format (e.g. MP4, WebM, AVI).");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setUploadError("File size exceeds the 100MB limit. Please compress your video or select a smaller file.");
        return;
      }
      setVideoFile(file);
      const filename = file.name;
      if (!videoTitle) {
        setVideoTitle(filename);
      }

      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoEl.src);
        const durationSecs = videoEl.duration;
        const hours = Math.floor(durationSecs / 3600);
        const minutes = Math.floor((durationSecs % 3600) / 60);
        const seconds = Math.floor(durationSecs % 60);
        
        let formatted = "";
        if (hours > 0) {
          formatted += `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        } else {
          formatted += `${minutes}:${seconds.toString().padStart(2, "0")}`;
        }
        setVideoDuration(formatted);
      };
      videoEl.src = URL.createObjectURL(file);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setVideoDuration("00:00");
    setVideoCategorySelected("All");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    resetForm();
  };

  const handleUpload = async () => {
    if (!videoFile || !videoTitle.trim()) {
      setUploadError("Please provide both a video file and a title.");
      return;
    }
    
    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const sigResponse = await axiosInstance.get("/video/signature");
      const { signature, timestamp, cloudName, apiKey } = sigResponse.data;

      const formData = new FormData();
      formData.append("file", videoFile);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", "videos");

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(progress);
            }
          }
        }
      );

      const downloadURL = response.data.secure_url;
      console.log("Cloudinary upload successful:", downloadURL);

      await axiosInstance.post("/video/upload", {
        videotitle: videoTitle,
        filename: videoFile.name,
        filepath: downloadURL,
        filetype: videoFile.type || "video/mp4",
        filesize: (videoFile.size / (1024 * 1024)).toFixed(2) + " MB",
        videochanel: user?.channelname || "Anonymous Channel",
        uploader: user?._id || "",
        videoduration: videoDuration,
        videocategory: videoCategorySelected,
        isPremium: isPremiumVideo,
      });

      setUploadComplete(true);
      setTimeout(() => {
        resetForm();
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }, 1000);
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      const errorMsg = error.response?.data?.error?.message || error.message || "Failed to upload video.";
      setUploadError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm transition-colors">
      <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">Upload Video</h2>

      {uploadError && (
        <div className="p-3.5 mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError("")} className="text-red-500 hover:text-red-700 ml-2 font-bold cursor-pointer">×</button>
        </div>
      )}

      <div className="space-y-4">
        {!videoFile ? (
          <div
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-red-500 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-500 mb-2 animate-bounce" />
            <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
              Drag and drop video files to upload
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              or click to select files
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
              MP4, WebM, MOV or AVI • Up to 100MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handlefilechange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="bg-red-50 dark:bg-red-950/50 p-2 rounded-lg">
                <FileVideo className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{videoFile.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700" onClick={cancelUpload}>
                  <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-green-100 dark:bg-green-950 p-1.5 rounded-full">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title" className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">Title (required)</Label>
                <Input
                  id="title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Add a title that describes your video"
                  disabled={isUploading || uploadComplete}
                  className="mt-1 bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <Label htmlFor="category" className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">Category (optional)</Label>
                <select
                  id="category"
                  value={videoCategorySelected}
                  onChange={(e) => setVideoCategorySelected(e.target.value)}
                  disabled={isUploading || uploadComplete}
                  className="flex h-10 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 mt-1 cursor-pointer"
                >
                  <option value="All">Select a Category (default: All)</option>
                  <option value="Music">Music</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Movies">Movies</option>
                  <option value="News">News</option>
                  <option value="Sports">Sports</option>
                  <option value="Technology">Technology</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Education">Education</option>
                  <option value="Science">Science</option>
                  <option value="Travel">Travel</option>
                  <option value="Food">Food</option>
                  <option value="Fashion">Fashion</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={isPremiumVideo}
                  onChange={(e) => setIsPremiumVideo(e.target.checked)}
                  disabled={isUploading || uploadComplete}
                  className="w-4 h-4 text-amber-600 rounded border-zinc-300 focus:ring-amber-500 cursor-pointer"
                />
                <Label htmlFor="isPremium" className="font-semibold text-xs text-amber-900 dark:text-amber-300 cursor-pointer flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Mark as Premium Video (Requires Bronze / Silver / Gold Plan to Watch)</span>
                </Label>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Uploading video...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <div 
                    className="bg-red-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              {!uploadComplete && (
                <>
                  <Button variant="outline" className="rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-0" onClick={cancelUpload} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 rounded-xl shadow cursor-pointer"
                    disabled={isUploading || !videoTitle.trim() || uploadComplete}
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
