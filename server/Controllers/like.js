import video from "../Modals/video.js";
import like from "../Modals/like.js";
import dislike from "../Modals/dislike.js";

// Atomic Like Handler
export const handlelike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  if (!userId || !videoId) {
    return res.status(400).json({ message: "User ID and Video ID are required." });
  }

  try {
    const existingLike = await like.findOne({ viewer: userId, videoid: videoId });
    const existingDislike = await dislike.findOne({ viewer: userId, videoid: videoId });

    if (existingLike) {
      // Toggle OFF Like
      await like.findByIdAndDelete(existingLike._id);
    } else {
      // Toggle ON Like
      await like.create({ viewer: userId, videoid: videoId });

      // Atomically remove Dislike if previously active
      if (existingDislike) {
        await dislike.findByIdAndDelete(existingDislike._id);
      }
    }

    const likesCount = await like.countDocuments({ videoid: videoId });
    const dislikesCount = await dislike.countDocuments({ videoid: videoId });

    // Sync counts back to Video document
    await video.findByIdAndUpdate(
      videoId,
      { $set: { Like: likesCount, Dislike: dislikesCount } }
    );

    const isLiked = Boolean(await like.exists({ viewer: userId, videoid: videoId }));
    const isDisliked = Boolean(await dislike.exists({ viewer: userId, videoid: videoId }));

    return res.status(200).json({
      liked: isLiked,
      disliked: isDisliked,
      likes: likesCount,
      dislikes: dislikesCount,
    });
  } catch (error) {
    console.error("Like error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Atomic Dislike Handler
export const handledislike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  if (!userId || !videoId) {
    return res.status(400).json({ message: "User ID and Video ID are required." });
  }

  try {
    const existingDislike = await dislike.findOne({ viewer: userId, videoid: videoId });
    const existingLike = await like.findOne({ viewer: userId, videoid: videoId });

    if (existingDislike) {
      // Toggle OFF Dislike
      await dislike.findByIdAndDelete(existingDislike._id);
    } else {
      // Toggle ON Dislike
      await dislike.create({ viewer: userId, videoid: videoId });

      // Atomically remove Like if previously active
      if (existingLike) {
        await like.findByIdAndDelete(existingLike._id);
      }
    }

    const likesCount = await like.countDocuments({ videoid: videoId });
    const dislikesCount = await dislike.countDocuments({ videoid: videoId });

    // Sync counts back to Video document
    await video.findByIdAndUpdate(
      videoId,
      { $set: { Like: likesCount, Dislike: dislikesCount } }
    );

    const isLiked = Boolean(await like.exists({ viewer: userId, videoid: videoId }));
    const isDisliked = Boolean(await dislike.exists({ viewer: userId, videoid: videoId }));

    return res.status(200).json({
      liked: isLiked,
      disliked: isDisliked,
      likes: likesCount,
      dislikes: dislikesCount,
    });
  } catch (error) {
    console.error("Dislike error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get User Reaction Status
export const getReactionStatus = async (req, res) => {
  const { videoId, userId } = req.params;
  try {
    const isLiked = Boolean(await like.exists({ viewer: userId, videoid: videoId }));
    const isDisliked = Boolean(await dislike.exists({ viewer: userId, videoid: videoId }));
    const likesCount = await like.countDocuments({ videoid: videoId });
    const dislikesCount = await dislike.countDocuments({ videoid: videoId });

    return res.status(200).json({
      liked: isLiked,
      disliked: isDisliked,
      likes: likesCount,
      dislikes: dislikesCount,
    });
  } catch (error) {
    return res.status(500).json({ liked: false, disliked: false, likes: 0, dislikes: 0 });
  }
};

// Fetch User Liked Videos
export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ createdAt: -1, _id: -1 })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error("Error fetching liked videos:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};