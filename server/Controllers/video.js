import mongoose from "mongoose";
import video from "../Modals/video.js";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});


export const uploadvideo = async (req, res) => {
  // Check if filepath was uploaded directly to Firebase Storage and passed as a URL string in req.body
  if (req.body.filepath && (req.body.filepath.startsWith("http://") || req.body.filepath.startsWith("https://"))) {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.body.filename || req.body.videotitle,
        filepath: req.body.filepath,
        filetype: req.body.filetype || "video/mp4",
        filesize: req.body.filesize || "0 MB",
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
        videoduration: req.body.videoduration,
        videocategory: req.body.videocategory || "All",
      });
      await file.save();
      // Broadcast live event to all connected WebSockets
      const wss = req.app.get("wss");
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: "global-video-uploaded" }));
          }
        });
      }
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }

  // Fallback to local Multer file uploads:
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: "uploads/" + req.file.filename,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
        videoduration: req.body.videoduration,
        videocategory: req.body.videocategory || "All",
      });
      await file.save();
      // Broadcast live event to all connected WebSockets
      const wss = req.app.get("wss");
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: "global-video-uploaded" }));
          }
        });
      }
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getvideoById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Video not found" });
  }
  try {
    const file = await video.findById(id);
    if (!file) {
      return res.status(404).json({ message: "Video not found" });
    }
    return res.status(200).send(file);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletevideo = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Video not found" });
  }
  try {
    const file = await video.findById(id);
    if (!file) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    // Attempt to delete physical file from server (only if it is a local upload)
    if (file.filepath && !file.filepath.startsWith("http") && !file.filepath.startsWith("https")) {
      try {
        const filePath = path.join(process.cwd(), file.filepath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.error("Failed to delete physical video file:", fileErr);
      }
    }

    await video.findByIdAndDelete(id);

    // Broadcast live event to all connected WebSockets
    const wss = req.app.get("wss");
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: "global-video-deleted", videoId: id }));
        }
      });
    }

    return res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updatevideo = async (req, res) => {
  const { id } = req.params;
  const { videotitle } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Video not found" });
  }
  try {
    const file = await video.findById(id);
    if (!file) {
      return res.status(404).json({ message: "Video not found" });
    }

    const updated = await video.findByIdAndUpdate(id, { videotitle }, { new: true });

    // Broadcast live event to all connected WebSockets
    const wss = req.app.get("wss");
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: "global-video-updated", videoId: id, videotitle }));
        }
      });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getCloudinarySignature = async (req, res) => {
  try {
    const timestamp = Math.round((new Date()).getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request({
      timestamp: timestamp,
      folder: 'videos'
    }, process.env.CLOUDINARY_API_SECRET);

    return res.status(200).json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY
    });
  } catch (error) {
    console.error("Error generating Cloudinary signature:", error);
    return res.status(500).json({ message: "Failed to generate upload signature" });
  }
};