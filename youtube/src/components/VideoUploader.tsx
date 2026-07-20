import { Check, FileVideo, Upload, X } from "lucide-react";
import React, { ChangeEvent, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import axiosInstance from "../lib/axiosinstance";
import { useUser } from "../lib/AuthContext";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

const VideoUploader = ({ onUploadSuccess }: any) => {
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDuration, setVideoDuration] = useState("00:00");
  const [videoCategorySelected, setVideoCategorySelected] = useState("All");
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

      // Calculate video duration on the client side using metadata
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

  const handleUpload = () => {
    if (!videoFile || !videoTitle.trim()) {
      setUploadError("Please provide both a video file and a title.");
      return;
    }
    
    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `videos/${Date.now()}_${videoFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, videoFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Firebase Storage Upload Error:", error);
          setUploadError("Could not upload file to Firebase: " + error.message);
          setIsUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("File uploaded, permanent URL available:", downloadURL);

            // Send metadata (along with the permanent downloadURL) to the backend
            await axiosInstance.post("/video/upload", {
              videotitle: videoTitle,
              filepath: downloadURL,
              videochanel: user?.channelname || "Anonymous Channel",
              uploader: user?._id || "",
              videoduration: videoDuration,
              videocategory: videoCategorySelected,
              filesize: (videoFile.size / (1024 * 1024)).toFixed(2) + " MB"
            });

            setUploadComplete(true);
            setTimeout(() => {
              resetForm();
              if (onUploadSuccess) {
                onUploadSuccess();
              }
            }, 1000);
          } catch (postError: any) {
            console.error("Error saving database metadata:", postError);
            setUploadError(
              "Could not save video metadata: " +
                (postError.response?.data?.message || postError.message)
            );
          } finally {
            setIsUploading(false);
          }
        }
      );
    } catch (err: any) {
      console.error("Upload initialization failed:", err);
      setUploadError("Upload failed: " + err.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200/50">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Upload Video</h2>

      {/* Visual Error Message Box */}
      {uploadError && (
        <div className="p-3.5 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError("")} className="text-red-500 hover:text-red-700 ml-2 font-bold">×</button>
        </div>
      )}

      <div className="space-y-4">
        {!videoFile ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:bg-gray-100 hover:border-red-400 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2 animate-bounce" />
            <p className="text-lg font-medium text-gray-700">
              Drag and drop video files to upload
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to select files
            </p>
            <p className="text-xs text-gray-400 mt-4">
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
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-150">
              <div className="bg-red-50 p-2 rounded-lg">
                <FileVideo className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{videoFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" className="rounded-full" onClick={cancelUpload}>
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-green-100 p-1.5 rounded-full">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title" className="font-semibold text-xs text-gray-600">Title (required)</Label>
                <Input
                  id="title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Add a title that describes your video"
                  disabled={isUploading || uploadComplete}
                  className="mt-1 border-gray-200"
                />
              </div>

              <div>
                <Label htmlFor="category" className="font-semibold text-xs text-gray-600">Category (optional)</Label>
                <select
                  id="category"
                  value={videoCategorySelected}
                  onChange={(e) => setVideoCategorySelected(e.target.value)}
                  disabled={isUploading || uploadComplete}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1 cursor-pointer border-gray-200"
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
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-gray-700">
                  <span>Uploading video...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
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
                  <Button variant="outline" className="rounded-xl" onClick={cancelUpload} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 rounded-xl shadow"
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
