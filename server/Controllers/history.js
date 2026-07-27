import video from "../Modals/video.js";
import history from "../Modals/history.js";

export const handlehistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    // Delete any existing watch history entries for this video by this user to prevent stacking duplicates
    await history.deleteMany({ viewer: userId, videoid: videoId });

    const newHistory = await history.create({
      viewer: userId,
      videoid: videoId,
      likedon: new Date(),
    });
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ history: newHistory });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const handleview = async (req, res) => {
  const { videoId } = req.params;
  try {
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ message: "View updated successfully" });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .exec();

    // Deduplicate history records so each video appears EXACTLY ONCE at its latest watched timestamp
    const uniqueHistoryMap = new Map();
    for (const item of historyvideo) {
      if (item && item.videoid && item.videoid._id) {
        const vidIdStr = item.videoid._id.toString();
        if (!uniqueHistoryMap.has(vidIdStr)) {
          uniqueHistoryMap.set(vidIdStr, item);
        }
      }
    }
    const deduplicatedHistory = Array.from(uniqueHistoryMap.values());

    return res.status(200).json(deduplicatedHistory);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deleteHistory = async (req, res) => {
  const { id } = req.params;
  try {
    await history.findByIdAndDelete(id);
    return res.status(200).json({ message: "History item deleted successfully" });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};