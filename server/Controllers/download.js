import mongoose from "mongoose";
import crypto from "crypto";
import user from "../Modals/auth.js";
import download from "../Modals/download.js";
import video from "../Modals/video.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30 (India Standard Time has no DST)

// Returns the exact UTC Date instant corresponding to 00:00:00 IST for a given date
const getStartOfDayIST = (date = new Date()) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
};

// Helper function to check if two dates fall on the same IST calendar day
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return getStartOfDayIST(new Date(d1)).getTime() === getStartOfDayIST(new Date(d2)).getTime();
};

// Maximum downloads allowed per plan per day
const PLAN_LIMITS = {
  Free: 1,
  Bronze: 5,
  Silver: 15,
  Gold: 50,
};

// 1. Track & Validate Download Attempt (Atomic Quota Increment + 10-Min Expiring Signed Token URL)
export const trackDownload = async (req, res) => {
  const { userId, videoId } = req.body;

  if (!userId || !videoId) {
    return res
      .status(400)
      .json({ message: "User ID and Video ID are required." });
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    return res.status(400).json({ message: "Invalid ID format." });
  }

  try {
    const existingUser = await user.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const targetVideo = await video.findById(videoId);
    if (!targetVideo) {
      return res.status(404).json({ message: "Video not found." });
    }

    const userPlan = existingUser.plan || "Free";
    const maxAllowed = PLAN_LIMITS[userPlan] || 1;
    const today = new Date();
    const startOfToday = getStartOfDayIST(today);

    // Evaluate if user needs new day reset
    const isNewDay = !existingUser.lastDownloadDate || existingUser.lastDownloadDate < startOfToday;

    let updatedUser;
    if (isNewDay) {
      // New day reset: atomically set count to 1 and update lastDownloadDate
      updatedUser = await user.findOneAndUpdate(
        { _id: userId },
        { $set: { dailyDownloadsCount: 1, lastDownloadDate: today } },
        { returnDocument: "after" }
      );
    } else {
      // Same day: atomic conditional increment ONLY IF dailyDownloadsCount < maxAllowed
      updatedUser = await user.findOneAndUpdate(
        { _id: userId, dailyDownloadsCount: { $lt: maxAllowed } },
        { $inc: { dailyDownloadsCount: 1 }, $set: { lastDownloadDate: today } },
        { returnDocument: "after" }
      );
    }

    // Quota Exceeded!
    if (!updatedUser) {
      const currentCount = existingUser.dailyDownloadsCount || maxAllowed;
      return res.status(403).json({
        limitReached: true,
        userPlan,
        currentCount,
        maxAllowed,
        message: `Daily download limit reached for your ${userPlan} plan (${currentCount}/${maxAllowed}). Upgrade your plan to Gold for more downloads!`,
      });
    }

    // Create a download record log
    const newDownload = new download({
      userid: userId,
      videoid: videoId,
      downloadedAt: today,
    });
    await newDownload.save();

    // Generate 10-Minute Cryptographically Signed Expiring Download Token
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const secret =
      process.env.DOWNLOAD_TOKEN_SECRET ||
      process.env.JWT_SECRET ||
      "youtube_dedicated_download_token_secret_key";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${userId}:${videoId}:${expiresAt}`)
      .digest("hex");
    const downloadToken = `${userId}:${videoId}:${expiresAt}:${signature}`;

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const downloadUrl = `${backendUrl}/video/stream-download/${videoId}?token=${downloadToken}`;

    return res.status(200).json({
      success: true,
      message: "Download approved",
      downloadUrl,
      downloadsToday: updatedUser.dailyDownloadsCount,
      maxAllowed,
      userPlan,
      downloadRecord: newDownload,
    });
  } catch (error) {
    console.error("Error in trackDownload:", error);
    return res.status(500).json({ message: "Server error tracking download." });
  }
};

// 2. Fetch User Download History & Quota Status (Unique Videos for UI)
export const getUserDownloads = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID format." });
  }

  try {
    const existingUser = await user.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const today = new Date();
    let currentCount = existingUser.dailyDownloadsCount || 0;
    if (!isSameDay(existingUser.lastDownloadDate, today)) {
      currentCount = 0;
    }

    const userPlan = existingUser.plan || "Free";
    const maxAllowed = PLAN_LIMITS[userPlan] || 1;

    // Fetch all download records sorted by newest first
    const rawDownloads = await download
      .find({ userid: userId })
      .populate("videoid")
      .sort({ downloadedAt: -1 });

    // Deduplicate by video ID so each video appears ONLY ONCE in the Downloads Library UI
    const uniqueDownloadsMap = new Map();
    for (const item of rawDownloads) {
      if (item.videoid && item.videoid._id) {
        const vidStr = item.videoid._id.toString();
        if (!uniqueDownloadsMap.has(vidStr)) {
          uniqueDownloadsMap.set(vidStr, item);
        }
      }
    }

    const downloads = Array.from(uniqueDownloadsMap.values());

    return res.status(200).json({
      userPlan,
      downloadsToday: currentCount,
      maxAllowed,
      downloads,
    });
  } catch (error) {
    console.error("Error in getUserDownloads:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching download history." });
  }
};

// 3. Remove Video from Downloads Library
export const deleteDownloadRecord = async (req, res) => {
  const { id } = req.params;

  try {
    const record = await download.findById(id);
    if (record) {
      // Delete all download logs for this video and user so the card disappears
      await download.deleteMany({
        userid: record.userid,
        videoid: record.videoid,
      });
      return res
        .status(200)
        .json({ message: "Removed video from Downloads library." });
    }

    const deleted = await download.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Download record not found." });
    }
    return res.status(200).json({ message: "Removed from downloads history." });
  } catch (error) {
    console.error("Error in deleteDownloadRecord:", error);
    return res
      .status(500)
      .json({ message: "Server error deleting download record." });
  }
};

// 4. Update User Plan (Free vs Paid Tiers)
export const updateUserPlan = async (req, res) => {
  const { userId, plan } = req.body;

  if (!userId || !plan) {
    return res.status(400).json({ message: "User ID and Plan are required." });
  }

  const validPlans = ["Free", "Bronze", "Silver", "Gold"];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ message: "Invalid plan type." });
  }

  try {
    const updateFields = { plan };
    if (plan === "Free") {
      updateFields.subscriptionStartDate = null;
      updateFields.subscriptionExpiresAt = null;
    }

    const updatedUser = await user.findByIdAndUpdate(userId, updateFields, {
      returnDocument: "after",
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({
      message: `Plan updated to ${plan} successfully!`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateUserPlan:", error);
    return res.status(500).json({ message: "Server error updating plan." });
  }
};
