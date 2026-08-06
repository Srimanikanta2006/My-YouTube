import mongoose from "mongoose";
import video from "../Modals/video.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { sendTargetedNotification } from "./notification.js";
import user from "../Modals/auth.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});


const notifySubscribersAndUploader = async (req, savedFile) => {
  try {
    // 1. Notify Creator / Uploader
    if (savedFile.uploader) {
      await sendTargetedNotification(req, {
        recipientUserId: savedFile.uploader,
        type: "upload",
        title: "🎬 Your upload is ready.",
        message: `"${savedFile.videotitle}" uploaded successfully.`,
        actionUrl: `/watch/${savedFile._id}`,
      });
    }

    // 2. Find subscribers of this channel and notify each subscriber
    const searchTerms = [savedFile.uploader, savedFile.videochanel].filter(Boolean);
    if (searchTerms.length > 0) {
      const subscribers = await user.find({
        $or: [
          { subscribedChannels: { $in: searchTerms } },
          { subscriptions: { $in: searchTerms } },
        ],
        _id: { $ne: savedFile.uploader }
      });

      for (const sub of subscribers) {
        await sendTargetedNotification(req, {
          recipientUserId: sub._id.toString(),
          type: "upload",
          title: `🎬 ${savedFile.videochanel} uploaded a new video.`,
          message: `"${savedFile.videotitle}"`,
          actionUrl: `/watch/${savedFile._id}`,
        });
      }
    }
  } catch (err) {
    console.error("Error sending targeted upload notifications:", err);
  }
};

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
        uploaderImage: req.body.uploaderImage || "",
        videoduration: req.body.videoduration,
        videocategory: req.body.videocategory || "All",
        description: typeof req.body.description === "string" ? req.body.description.trim().slice(0, 5000) : "",
        isPremium: req.body.isPremium || false,
      });
      await file.save();
      await notifySubscribersAndUploader(req, file);

      // Broadcast live event to all connected WebSockets
      const wss = req.app.get("wss");
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: "global-video-uploaded", videoId: file._id }));
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
        uploaderImage: req.body.uploaderImage || "",
        videoduration: req.body.videoduration,
        videocategory: req.body.videocategory || "All",
        description: typeof req.body.description === "string" ? req.body.description.trim().slice(0, 5000) : "",
        isPremium: req.body.isPremium || false,
      });
      await file.save();
      await notifySubscribersAndUploader(req, file);

      // Broadcast live event to all connected WebSockets
      const wss = req.app.get("wss");
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: "global-video-uploaded", videoId: file._id }));
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
import like from "../Modals/like.js";
import dislike from "../Modals/dislike.js";

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    const result = await Promise.all(
      files.map(async (file) => {
        const likesCount = await like.countDocuments({ videoid: file._id });
        const dislikesCount = await dislike.countDocuments({ videoid: file._id });
        let uploaderUser = null;
        if (file.uploader || file.videochanel) {
          const searchQueries = [];
          if (file.uploader && mongoose.Types.ObjectId.isValid(file.uploader)) {
            searchQueries.push({ _id: file.uploader });
          }
          if (file.uploader) {
            searchQueries.push({ channelname: file.uploader });
            searchQueries.push({ name: file.uploader });
          }
          if (file.videochanel) {
            searchQueries.push({ channelname: file.videochanel });
            searchQueries.push({ name: file.videochanel });
          }
          uploaderUser = await user.findOne({ $or: searchQueries }).select("image channelname name subscribers");
        }
        const obj = file.toObject();
        obj.Like = likesCount;
        obj.Dislike = dislikesCount;
        obj.uploaderImage = uploaderUser?.image || file.uploaderImage || "";
        obj.subscribersCount = uploaderUser?.subscribers ? (Array.isArray(uploaderUser.subscribers) ? uploaderUser.subscribers.length : 0) : (file.subscribersCount || 0);
        if (uploaderUser?.channelname) {
          obj.videochanel = uploaderUser.channelname;
        }
        return obj;
      })
    );
    return res.status(200).send(result);
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
    const likesCount = await like.countDocuments({ videoid: id });
    const dislikesCount = await dislike.countDocuments({ videoid: id });
    let uploaderUser = null;
    if (file.uploader || file.videochanel) {
      const searchQueries = [];
      if (file.uploader && mongoose.Types.ObjectId.isValid(file.uploader)) {
        searchQueries.push({ _id: file.uploader });
      }
      if (file.uploader) {
        searchQueries.push({ channelname: file.uploader });
        searchQueries.push({ name: file.uploader });
      }
      if (file.videochanel) {
        searchQueries.push({ channelname: file.videochanel });
        searchQueries.push({ name: file.videochanel });
      }
      uploaderUser = await user.findOne({ $or: searchQueries }).select("image channelname name subscribers");
    }
    const fileObj = file.toObject();
    fileObj.Like = likesCount;
    fileObj.Dislike = dislikesCount;
    fileObj.uploaderImage = uploaderUser?.image || file.uploaderImage || "";
    fileObj.subscribersCount = uploaderUser?.subscribers ? (Array.isArray(uploaderUser.subscribers) ? uploaderUser.subscribers.length : 0) : (file.subscribersCount || 0);
    if (uploaderUser?.channelname) {
      fileObj.videochanel = uploaderUser.channelname;
    }
    return res.status(200).send(fileObj);
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
  const { videotitle, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Video not found" });
  }
  try {
    const file = await video.findById(id);
    if (!file) {
      return res.status(404).json({ message: "Video not found" });
    }

    const updateFields = {};
    if (videotitle !== undefined) updateFields.videotitle = videotitle.trim();
    if (description !== undefined) {
      updateFields.description = typeof description === "string" ? description.trim().slice(0, 5000) : "";
    }

    const updated = await video.findByIdAndUpdate(id, { $set: updateFields }, { returnDocument: "after" });

    // Broadcast live event to all connected WebSockets
    const wss = req.app.get("wss");
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "global-video-updated",
            videoId: id,
            videotitle: updated.videotitle,
            description: updated.description,
          }));
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

// Stream Download Video with Signed Expiring Token Verification
export const streamDownloadVideo = async (req, res) => {
  const { id } = req.params;
  const { token } = req.query;

  if (!token) {
    return res.status(401).json({ message: "Download token is required." });
  }

  try {
    const parts = token.split(":");
    if (parts.length !== 4) {
      return res.status(400).json({ message: "Invalid download token format." });
    }

    const [userId, videoId, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
      return res.status(403).json({ message: "Download link expired. Please request a new download." });
    }

    if (videoId !== id) {
      return res.status(403).json({ message: "Token video ID mismatch." });
    }

    const secret =
      process.env.DOWNLOAD_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      "youtube_dedicated_download_token_secret_key";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${userId}:${videoId}:${expiresAtStr}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(403).json({ message: "Invalid download token signature." });
    }

    const videoDoc = await video.findById(id);
    if (!videoDoc) {
      return res.status(404).json({ message: "Video not found." });
    }

    // Set download attachment headers
    const filename = videoDoc.filename || `${videoDoc.videotitle || 'video'}.mp4`;
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader("Content-Type", videoDoc.filetype || "video/mp4");

    // Redirect or stream file (Inject fl_attachment for Cloudinary hosted URLs)
    if (videoDoc.filepath.startsWith("http://") || videoDoc.filepath.startsWith("https://")) {
      let targetUrl = videoDoc.filepath;
      if (targetUrl.includes("cloudinary.com") && targetUrl.includes("/upload/")) {
        targetUrl = targetUrl.replace("/upload/", "/upload/fl_attachment/");
      }
      return res.redirect(targetUrl);
    } else {
      const filePath = path.resolve(videoDoc.filepath);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      } else {
        return res.status(404).json({ message: "Video file not found on server storage." });
      }
    }
  } catch (error) {
    console.error("Error in streamDownloadVideo:", error);
    return res.status(500).json({ message: "Server error streaming download." });
  }
};