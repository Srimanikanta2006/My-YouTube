import mongoose from "mongoose";
import user from "../Modals/auth.js";
import download from "../Modals/download.js";
import video from "../Modals/video.js";

// Helper function to check if two dates are on the same calendar day
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Maximum downloads allowed per plan per day
const PLAN_LIMITS = {
  Free: 1,
  Bronze: 5,
  Silver: 15,
  Gold: 50,
  Premium: 10,
};

// 1. Track & Validate Download Attempt
export const trackDownload = async (req, res) => {
  const { userId, videoId } = req.body;

  if (!userId || !videoId) {
    return res.status(400).json({ message: "User ID and Video ID are required." });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid User ID format." });
  }

  try {
    const existingUser = await user.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const userPlan = existingUser.plan || "Free";
    const maxAllowed = PLAN_LIMITS[userPlan] || 1;

    const today = new Date();
    let currentCount = existingUser.dailyDownloadsCount || 0;

    // Reset daily count if last download was on a previous day
    if (!isSameDay(existingUser.lastDownloadDate, today)) {
      currentCount = 0;
    }

    // Check if user exceeded their daily quota
    if (currentCount >= maxAllowed) {
      return res.status(403).json({
        limitReached: true,
        userPlan,
        currentCount,
        maxAllowed,
        message: `Daily download limit reached for your ${userPlan} plan (${currentCount}/${maxAllowed}). Upgrade to Premium to download more videos!`,
      });
    }

    // Update user quota state
    existingUser.dailyDownloadsCount = currentCount + 1;
    existingUser.lastDownloadDate = today;
    await existingUser.save();

    // Create a download record entry
    const newDownload = new download({
      userid: userId,
      videoid: videoId,
      downloadedAt: today,
    });
    await newDownload.save();

    return res.status(200).json({
      success: true,
      message: "Download approved",
      downloadsToday: existingUser.dailyDownloadsCount,
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
    return res.status(500).json({ message: "Server error fetching download history." });
  }
};

// 3. Remove Video from Downloads Library
export const deleteDownloadRecord = async (req, res) => {
  const { id } = req.params;

  try {
    const record = await download.findById(id);
    if (record) {
      // Delete all download logs for this video and user so the card disappears
      await download.deleteMany({ userid: record.userid, videoid: record.videoid });
      return res.status(200).json({ message: "Removed video from Downloads library." });
    }

    const deleted = await download.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Download record not found." });
    }
    return res.status(200).json({ message: "Removed from downloads history." });
  } catch (error) {
    console.error("Error in deleteDownloadRecord:", error);
    return res.status(500).json({ message: "Server error deleting download record." });
  }
};

// 4. Update User Plan (Free vs Premium)
export const updateUserPlan = async (req, res) => {
  const { userId, plan } = req.body;

  if (!userId || !plan) {
    return res.status(400).json({ message: "User ID and Plan are required." });
  }

  if (!["Free", "Premium"].includes(plan)) {
    return res.status(400).json({ message: "Plan must be either 'Free' or 'Premium'." });
  }

  try {
    const updatedUser = await user.findByIdAndUpdate(
      userId,
      { plan },
      { new: true }
    );
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
