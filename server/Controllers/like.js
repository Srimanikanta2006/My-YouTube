import video from "../Modals/video.js";
import like from "../Modals/like.js";

export const handlelike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    const exisitinglike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });
    let updatedVideo;
    if (exisitinglike) {
      await like.findByIdAndDelete(exisitinglike._id);
      const v = await video.findById(videoId);
      const newLike = Math.max(0, (v?.Like || 1) - 1);
      updatedVideo = await video.findByIdAndUpdate(
        videoId,
        { $set: { Like: newLike } },
        { returnDocument: "after" }
      );
      return res.status(200).json({ liked: false, likes: updatedVideo ? updatedVideo.Like : 0 });
    } else {
      await like.create({ viewer: userId, videoid: videoId });
      const v = await video.findById(videoId);
      const newLike = (v?.Like || 0) + 1;
      updatedVideo = await video.findByIdAndUpdate(
        videoId,
        { $set: { Like: newLike } },
        { returnDocument: "after" }
      );
      return res.status(200).json({ liked: true, likes: updatedVideo ? updatedVideo.Like : 0 });
    }
  } catch (error) {
    console.error("Like error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

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
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handledislike = async (req, res) => {
  const { videoId } = req.params;
  const { increment } = req.body; // true to increment, false to decrement
  try {
    const v = await video.findById(videoId);
    let newDislike = v?.Dislike || 0;
    if (increment) {
      newDislike = newDislike + 1;
    } else {
      newDislike = Math.max(0, newDislike - 1);
    }

    const updated = await video.findByIdAndUpdate(
      videoId,
      { $set: { Dislike: newDislike } },
      { returnDocument: "after" }
    );
    return res.status(200).json({ dislikeCount: updated ? updated.Dislike : 0 });
  } catch (error) {
    console.error("Dislike error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};