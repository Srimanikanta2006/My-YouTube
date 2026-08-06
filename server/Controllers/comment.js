import comment from "../Modals/comment.js";
import user from "../Modals/auth.js";
import video from "../Modals/video.js";
import mongoose from "mongoose";
import { sendTargetedNotification } from "./notification.js";

// List of profanity and abusive terms for server-side lexical evaluation
const ABUSIVE_WORDS = [
  "2g1c", "acrotomophilia", "anal", "anilingus", "anus", "apeshit", "arsehole", "ass",
  "asshole", "assmunch", "autoerotic", "babeland", "bangbros", "bareback", "barenaked",
  "bastard", "bastardo", "bastinado", "bbw", "bdsm", "beaner", "beaners", "bestiality",
  "bimbos", "birdlock", "bitch", "bitches", "blowjob", "blumpkin", "bollocks", "bondage",
  "boner", "boob", "boobs", "bukkake", "bulldyke", "bullshit", "bunghole", "busty", "butt",
  "buttcheeks", "butthole", "camgirl", "camslut", "camwhore", "carpetmuncher", "circlejerk",
  "clit", "clitoris", "clusterfuck", "cock", "cocks", "coprolagnia", "coprophilia",
  "cornhole", "coon", "coons", "creampie", "cum", "cumming", "cunnilingus", "cunt", "darkie",
  "daterape", "deepthroat", "dendrophilia", "dick", "dildo", "dingleberry", "dingleberries",
  "doggiestyle", "doggystyle", "dolcett", "domination", "dominatrix", "dommes", "dvda",
  "ecchi", "ejaculation", "erotic", "erotism", "escort", "eunuch", "faggot", "fecal",
  "felch", "fellatio", "feltch", "femdom", "figging", "fingerbang", "fingering", "fisting",
  "footjob", "frotting", "fuck", "fuckin", "fucking", "fucktards", "fudgepacker",
  "futanari", "genitals", "goatcx", "goatse", "gokkun", "goodpoop", "goregasm", "grope",
  "g-spot", "guro", "handjob", "hardcore", "hentai", "homoerotic", "honkey", "hooker",
  "humping", "incest", "intercourse", "jailbait", "jigaboo", "jiggaboo", "jiggerboo",
  "jizz", "juggs", "kike", "kinbaku", "kinkster", "kinky", "knobbing", "lolita",
  "lovemaking", "masturbate", "milf", "motherfucker", "muffdiving", "nambla", "nawashi",
  "negro", "neonazi", "nigga", "nigger", "nimphomania", "nipple", "nipples", "nude",
  "nudity", "nympho", "nymphomania", "octopussy", "omorashi", "orgasm", "orgy",
  "paedophile", "paki", "panties", "panty", "pedobear", "pedophile", "pegging", "penis",
  "pissing", "pisspig", "playboy", "ponyplay", "poof", "poon", "poontang", "punany",
  "poopchute", "porn", "porno", "pornography", "pthc", "pubes", "pussy", "queaf", "queef",
  "quim", "raghead", "rape", "raping", "rapist", "rectum", "rimjob", "rimming", "sadism",
  "santorum", "scat", "schlong", "scissoring", "semen", "sex", "sexo", "sexy", "shemale",
  "shibari", "shit", "shitblimp", "shitty", "shota", "shrimping", "skeet", "slanteye",
  "slut", "s&m", "smut", "snatch", "snowballing", "sodomize", "sodomy", "spic", "splooge",
  "spooge", "spunk", "strapon", "strappado", "suck", "sucks", "swastika", "swinger",
  "threesome", "throating", "tit", "tits", "titties", "titty", "topless", "tosser",
  "towelhead", "tranny", "tribadism", "tubgirl", "tushy", "twat", "twink", "twinkie",
  "undressing", "upskirt", "urophilia", "vagina", "vibrator", "vorarephilia", "voyeur",
  "vulva", "wank", "wetback", "xx", "xxx", "yaoi", "yiffy", "zoophilia", "idiot", "stupid",
  "dumb", "fool", "scam", "harass", "loser", "scammer", "kill yourself"
];

// Helper: Input Sanitization & HTML Escaping (Prevents Cross-Site Scripting - XSS)
const sanitizeInputText = (str) => {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
};

// Modular Server-side Moderation Pipeline
const runModerationPipeline = (rawText) => {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return { passed: false, reason: "Comment content cannot be empty." };
  }

  // Text Normalization (lower casing, trimming, whitespace normalization)
  const normalizedText = rawText.trim().toLowerCase().replace(/\s+/g, " ");

  // 1. Profanity Filter (Regex lexical evaluation with word boundaries to avoid false positives)
  for (const word of ABUSIVE_WORDS) {
    const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, "i");
    if (wordBoundaryRegex.test(normalizedText)) {
      return {
        passed: false,
        reason: `Comment rejected: Profanity/abusive term detected ("${word}"). Please maintain community guidelines.`,
      };
    }
  }

  // 2. Character & Emoji Spam Filter (Detects continuous repetition e.g. "aaaaaaa" or "😂😂😂😂😂😂")
  const repeatedCharRegex = /(.)\1{8,}/u;
  if (repeatedCharRegex.test(rawText)) {
    return {
      passed: false,
      reason: "Comment rejected: Excessive repeated character/emoji flooding detected.",
    };
  }

  // 3. Special Character Symbol Spam Filter (Detects symbol flooding e.g. "!!!!!!!!!!" or "%%%%%%%%%%")
  const specialCharSpamRegex = /([!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])\1{5,}/;
  if (specialCharSpamRegex.test(rawText)) {
    return {
      passed: false,
      reason: "Comment rejected: Excessive repeated special symbol flooding detected.",
    };
  }

  return { passed: true };
};

// 1. Post Comment Controller (With Sanitization, Moderation & Time-based Rate Limiting)
export const postcomment = async (req, res) => {
  const { videoid, userid, commentbody, usercommented, location, showLocation, language } = req.body;

  // Authentication & Payload Validation
  if (!userid || !mongoose.Types.ObjectId.isValid(userid) || !videoid || !mongoose.Types.ObjectId.isValid(videoid)) {
    return res.status(400).json({ message: "Invalid or missing authentication credentials." });
  }

  // 1. Input Sanitization (XSS Prevention)
  const sanitizedText = sanitizeInputText(commentbody);

  // 2. Server-side Moderation Pipeline
  const moderation = runModerationPipeline(sanitizedText);
  if (!moderation.passed) {
    return res.status(400).json({ message: moderation.reason });
  }

  try {
    // Commenting is allowed for all signed-in users

    // 3. Time-Based Rate Limiting (Lightweight MongoDB Temporal Query: 1 comment every 10 seconds per user)
    const recentPostingCount = await comment.countDocuments({
      userid,
      videoid,
      createdAt: { $gte: new Date(Date.now() - 10 * 1000) },
    });

    if (recentPostingCount > 0) {
      return res.status(429).json({
        message: "Posting frequency limit exceeded. Please wait 10 seconds before posting again.",
      });
    }

    // 4. Duplicate Comment Detection (MongoDB Temporal Check within 60-second window)
    const duplicateComment = await comment.findOne({
      userid,
      videoid,
      commentbody: sanitizedText,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });

    if (duplicateComment) {
      return res.status(400).json({
        message: "Duplicate comment detected. You submitted an identical comment recently.",
      });
    }

    const commentingUser = await user.findById(userid).select("name channelname image");
    if (!commentingUser || !commentingUser.channelname || !commentingUser.channelname.trim()) {
      return res.status(400).json({
        message: "You must create a YouTube channel before posting comments!",
        requireChannel: true,
      });
    }

    const authorChannelName = commentingUser.channelname;
    const newComment = new comment({
      videoid,
      userid,
      commentbody: sanitizedText,
      usercommented: sanitizeInputText(authorChannelName),
      language: language || "en",
      location: {
        city: sanitizeInputText(location?.city || ""),
        country: sanitizeInputText(location?.country || ""),
      },
      showLocation: Boolean(showLocation),
      likes: [],
      dislikes: [],
      reports: [],
      isFlagged: false,
      moderationStatus: "approved",
      commentedon: new Date(),
    });

    await newComment.save();

    // Trigger targeted notification to video owner
    try {
      const targetVideo = await video.findById(videoid);
      if (targetVideo && targetVideo.uploader && targetVideo.uploader !== userid) {
        let uploaderUserId = targetVideo.uploader;
        if (!mongoose.Types.ObjectId.isValid(uploaderUserId)) {
          const uploaderObj = await user.findOne({
            $or: [{ channelname: targetVideo.uploader }, { name: targetVideo.uploader }]
          });
          if (uploaderObj) uploaderUserId = uploaderObj._id.toString();
        }

        await sendTargetedNotification(req, {
          recipientUserId: uploaderUserId,
          type: "comment",
          title: `💬 ${authorChannelName} commented on your video.`,
          message: `"${sanitizedText}"`,
          actionUrl: `/watch/${videoid}`,
          senderImage: commentingUser?.image || "",
        });
      }
    } catch (notifErr) {
      console.error("Error triggering comment notification:", notifErr);
    }

    const populatedComment = await comment.findById(newComment._id).populate({
      path: "userid",
      select: "name image channelname",
    });

    return res.status(200).json({ comment: true, data: populatedComment });
  } catch (error) {
    console.error("Error in postcomment:", error);
    return res.status(500).json({ message: "Server error creating comment." });
  }
};

// 2. Get All Comments (Indexed MongoDB Query, Sorted Newest First)
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoid)) {
    return res.status(400).json({ message: "Invalid video ID parameter." });
  }

  try {
    const comments = await comment
      .find({ videoid })
      .populate({
        path: "userid",
        select: "name image channelname",
      })
      .sort({ createdAt: -1 })
      .exec();

    const formattedComments = await Promise.all(
      comments.map(async (c) => {
        const cObj = c.toObject();
        if (!cObj.userid || typeof cObj.userid === "string" || !cObj.userid.image) {
          const searchQueries = [];
          if (cObj.userid && typeof cObj.userid === "string" && mongoose.Types.ObjectId.isValid(cObj.userid)) {
            searchQueries.push({ _id: cObj.userid });
          }
          if (cObj.usercommented) {
            searchQueries.push({ channelname: cObj.usercommented });
            searchQueries.push({ name: cObj.usercommented });
          }
          if (searchQueries.length > 0) {
            const authorUser = await user.findOne({ $or: searchQueries }).select("name image channelname");
            if (authorUser) {
              cObj.userid = {
                _id: authorUser._id,
                name: authorUser.name,
                channelname: authorUser.channelname,
                image: authorUser.image || "",
              };
            }
          }
        }
        return cObj;
      })
    );

    return res.status(200).json(formattedComments);
  } catch (error) {
    console.error("Error in getallcomment:", error);
    return res.status(500).json({ message: "Server error fetching comments." });
  }
};

// 3. Like Comment
export const likecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid ID parameters." });
  }

  try {
    const targetComment = await comment.findById(id);
    if (!targetComment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const hasLiked = targetComment.likes.some((l) => l.toString() === userId);
    const hasDisliked = targetComment.dislikes.some((d) => d.toString() === userId);

    if (hasLiked) {
      targetComment.likes = targetComment.likes.filter((l) => l.toString() !== userId);
    } else {
      targetComment.likes.push(userObjId);
      if (hasDisliked) {
        targetComment.dislikes = targetComment.dislikes.filter((d) => d.toString() !== userId);
      }
    }

    await targetComment.save();
    const updated = await comment.findById(id).populate({
      path: "userid",
      select: "name image channelname",
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error in likecomment:", error);
    return res.status(500).json({ message: "Server error toggling comment like." });
  }
};

// 4. Dislike Comment
export const dislikecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid ID parameters." });
  }

  try {
    const targetComment = await comment.findById(id);
    if (!targetComment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const hasLiked = targetComment.likes.some((l) => l.toString() === userId);
    const hasDisliked = targetComment.dislikes.some((d) => d.toString() === userId);

    if (hasDisliked) {
      targetComment.dislikes = targetComment.dislikes.filter((d) => d.toString() !== userId);
    } else {
      targetComment.dislikes.push(userObjId);
      if (hasLiked) {
        targetComment.likes = targetComment.likes.filter((l) => l.toString() !== userId);
      }
    }

    await targetComment.save();
    const updated = await comment.findById(id).populate({
      path: "userid",
      select: "name image channelname",
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error in dislikecomment:", error);
    return res.status(500).json({ message: "Server error toggling comment dislike." });
  }
};

// 5. Report Comment (Community Reporting & Manual Moderation Flagging)
export const reportcomment = async (req, res) => {
  const { id } = req.params;
  const { userId, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid parameters." });
  }

  try {
    const targetComment = await comment.findById(id);
    if (!targetComment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const alreadyReported = targetComment.reports.some(
      (r) => r.userId && r.userId.toString() === userId
    );

    if (alreadyReported) {
      return res.status(400).json({ message: "You have already submitted a report for this comment." });
    }

    targetComment.reports.push({
      userId: new mongoose.Types.ObjectId(userId),
      reason: sanitizeInputText(reason || "Inappropriate content"),
      createdAt: new Date(),
    });

    targetComment.isFlagged = true;
    targetComment.moderationStatus = "flagged";

    await targetComment.save();
    return res.status(200).json({
      success: true,
      message: "🚩 Comment reported successfully and flagged for administrative review.",
    });
  } catch (error) {
    console.error("Error in reportcomment:", error);
    return res.status(500).json({ message: "Server error reporting comment." });
  }
};

// 6. Delete Comment
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("Comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("Error in deletecomment:", error);
    return res.status(500).json({ message: "Something went wrong deleting comment." });
  }
};

// 7. Edit Comment (With Sanitization & Re-moderation)
export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("Comment unavailable");
  }

  const sanitizedText = sanitizeInputText(commentbody);
  const moderation = runModerationPipeline(sanitizedText);
  if (!moderation.passed) {
    return res.status(400).json({ message: moderation.reason });
  }

  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody: sanitizedText } },
      { returnDocument: "after" }
    ).populate({
      path: "userid",
      select: "name image channelname",
    });

    return res.status(200).json(updatecomment);
  } catch (error) {
    console.error("Error in editcomment:", error);
    return res.status(500).json({ message: "Something went wrong editing comment." });
  }
};