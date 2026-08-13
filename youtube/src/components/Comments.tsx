"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import Channeldialogue from "./channeldialogue";
import axiosInstance from "@/lib/axiosinstance";
import { addNotification } from "@/lib/notificationHelper";
import {
  ThumbsUp,
  ThumbsDown,
  Flag,
  Languages,
  MapPin,
  AlertCircle,
  Trash2,
  Edit3,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Crown,
  Check,
} from "lucide-react";

interface CommentLocation {
  city?: string;
  country?: string;
}

interface CommentReport {
  userId?: string;
  reason?: string;
  createdAt?: string;
}

interface Comment {
  _id: string;
  videoid: string;
  userid: any; // Populated user object or string ID
  commentbody: string;
  usercommented: string;
  language?: string;
  location?: CommentLocation;
  showLocation?: boolean;
  likes?: string[];
  dislikes?: string[];
  reports?: CommentReport[];
  isFlagged?: boolean;
  moderationStatus?: string;
  commentedon: string;
  createdAt?: string;
}

const REPORT_REASONS = [
  "🚫 Spam or misleading content",
  "🤬 Hate speech, harassment or abuse",
  "🔞 Explicit or inappropriate content",
  "⚠️ Violent or dangerous content",
  "⚡ Symbol or special character spam",
];

const TARGET_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "zh-CN", name: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ar", name: "Arabic", flag: "🇦🇪" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
];

const Comments = ({ videoId }: { videoId: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user, handlegooglesignin } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Preferred Target Language Selection
  const [preferredTargetLang, setPreferredTargetLang] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user_preferred_target_lang") || "en";
    }
    return "en";
  });

  // Privacy & Location
  const [shareLocation, setShareLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ city: string; country: string }>({
    city: "Hyderabad",
    country: "India",
  });

  // Translation State: Map of commentId -> { text, loading, active, targetCode, targetName, targetFlag }
  const [translations, setTranslations] = useState<{
    [key: string]: { text: string; loading: boolean; active: boolean; targetCode?: string; targetName?: string; targetFlag?: string };
  }>({});

  // Report Modal State
  const [reportModalCommentId, setReportModalCommentId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [isReporting, setIsReporting] = useState(false);

  // Toast Alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const showModerationAlert = (msg: string) => showToast(msg);
  const showSuccessMsg = (msg: string) => showToast(msg);

  useEffect(() => {
    loadComments();

    // Resolve user's city & country for optional location attachment
    if (typeof window !== "undefined") {
      fetch("https://ipwho.is/")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setUserLocation({
              city: data.city || "Hyderabad",
              country: data.country || "India",
            });
          }
        })
        .catch(() => {});
    }

    // Refresh comments every 6 seconds
    const interval = setInterval(() => {
      loadComments();
    }, 6000);

    return () => clearInterval(interval);
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  // 1. Submit Comment with Moderation Pipeline
  const handleSubmitComment = async () => {
    if (!user) {
      showModerationAlert("Please sign in to post comments.");
      return;
    }
    if (!user.channelname) {
      showModerationAlert("You must create a YouTube channel before posting comments!");
      setIsCreateChannelOpen(true);
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);

    try {
      const displayAuthorName = user.channelname || user.name || "Channel";
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: displayAuthorName,
        location: userLocation,
        showLocation: shareLocation,
      });

      if (res.data.data) {
        setComments([res.data.data, ...comments]);
      } else {
        loadComments();
      }

      setNewComment("");
      showSuccessMsg("Comment posted successfully!");
      addNotification({
        type: "comment",
        title: `💬 ${displayAuthorName} commented on your video.`,
        message: `Commented: "${newComment.substring(0, 35)}${newComment.length > 35 ? "..." : ""}"`,
        actionUrl: `/watch/${videoId}`,
      });
    } catch (error: any) {
      if (error.response?.data?.requireChannel) {
        setIsCreateChannelOpen(true);
      }
      const errorMsg = error.response?.data?.message || "Failed to post comment. Please try again.";
      showModerationAlert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Like Comment (Optimistic UI update)
  const handleLike = async (commentId: string) => {
    if (!user) {
      showModerationAlert("Please sign in to like comments.");
      return;
    }

    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== commentId) return c;
        const likes = c.likes || [];
        const dislikes = c.dislikes || [];
        const isLiked = likes.includes(user._id);
        const newLikes = isLiked
          ? likes.filter((id) => id !== user._id)
          : [...likes, user._id];
        const newDislikes = dislikes.filter((id) => id !== user._id);
        return { ...c, likes: newLikes, dislikes: newDislikes };
      })
    );

    try {
      const res = await axiosInstance.post(`/comment/like/${commentId}`, {
        userId: user._id,
      });
      if (res.data) {
        setComments((prev) => prev.map((c) => (c._id === commentId ? res.data : c)));
      }
    } catch (err) {
      console.error("Error liking comment:", err);
      loadComments();
    }
  };

  // 3. Dislike Comment (Optimistic UI update)
  const handleDislike = async (commentId: string) => {
    if (!user) {
      showModerationAlert("Please sign in to dislike comments.");
      return;
    }

    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== commentId) return c;
        const likes = c.likes || [];
        const dislikes = c.dislikes || [];
        const isDisliked = dislikes.includes(user._id);
        const newDislikes = isDisliked
          ? dislikes.filter((id) => id !== user._id)
          : [...dislikes, user._id];
        const newLikes = likes.filter((id) => id !== user._id);
        return { ...c, likes: newLikes, dislikes: newDislikes };
      })
    );

    try {
      const res = await axiosInstance.post(`/comment/dislike/${commentId}`, {
        userId: user._id,
      });
      if (res.data) {
        setComments((prev) => prev.map((c) => (c._id === commentId ? res.data : c)));
      }
    } catch (err) {
      console.error("Error disliking comment:", err);
      loadComments();
    }
  };

  // 4. Translate Comment into User's Preferred Target Language
  const handleTranslate = async (comment: Comment, targetLangOverride?: string) => {
    const commentId = comment._id;
    const currentTrans = translations[commentId];
    const targetCode = targetLangOverride || preferredTargetLang;
    const targetObj = TARGET_LANGUAGES.find((l) => l.code === targetCode) || TARGET_LANGUAGES[0];

    // Toggle off if already translated and active with same target language (and no explicit language change requested)
    if (currentTrans && currentTrans.active && currentTrans.targetCode === targetCode && !targetLangOverride) {
      setTranslations((prev) => ({
        ...prev,
        [commentId]: { ...prev[commentId], active: false },
      }));
      return;
    }

    const deactivateOthers = (prev: any) => {
      const next: any = {};
      Object.keys(prev).forEach((key) => {
        next[key] = { ...prev[key], active: false };
      });
      return next;
    };

    setTranslations((prev) => ({
      ...deactivateOthers(prev),
      [commentId]: { text: "", loading: true, active: false, targetCode, targetName: targetObj.name, targetFlag: targetObj.flag },
    }));

    try {
      const encodedText = encodeURIComponent(comment.commentbody);
      let translatedText = "";

      // Primary: Google GTX Translation API (Supports all target languages)
      try {
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodedText}`;
        const res = await fetch(googleUrl);
        const data = await res.json();

        if (Array.isArray(data) && Array.isArray(data[0])) {
          translatedText = data[0].map((item: any) => item[0] || "").join("");
        }
      } catch (gErr) {
        console.warn("Google translate fallback trigger:", gErr);
      }

      // Fallback: MyMemory Translation API
      if (!translatedText || translatedText.trim() === "") {
        const fallbackRes = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=autodetect|${targetCode}`
        );
        const fallbackData = await fallbackRes.json();
        let fallbackResult = fallbackData?.responseData?.translatedText;
        if (
          fallbackResult &&
          !fallbackResult.toUpperCase().includes("PLEASE SELECT TWO DISTINCT LANGUAGES") &&
          fallbackData?.responseStatus !== "403" &&
          fallbackData?.responseStatus !== 403
        ) {
          translatedText = fallbackResult;
        }
      }

      setTranslations((prev) => ({
        ...deactivateOthers(prev),
        [commentId]: {
          text: translatedText || comment.commentbody,
          loading: false,
          active: true,
          targetCode,
          targetName: targetObj.name,
          targetFlag: targetObj.flag,
        },
      }));
    } catch (err) {
      console.error("Translation error:", err);
      setTranslations((prev) => ({
        ...deactivateOthers(prev),
        [commentId]: {
          text: comment.commentbody,
          loading: false,
          active: true,
          targetCode,
          targetName: targetObj.name,
          targetFlag: targetObj.flag,
        },
      }));
    }
  };

  // 5. Submit Report
  const handleSubmitReport = async () => {
    if (!user || !reportModalCommentId) return;

    setIsReporting(true);
    try {
      const res = await axiosInstance.post(`/comment/report/${reportModalCommentId}`, {
        userId: user._id,
        reason: selectedReason,
      });

      if (res.data.success) {
        showSuccessMsg("🚩 Comment reported successfully and flagged for review.");
        loadComments();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to report comment.";
      showModerationAlert(errorMsg);
    } finally {
      setIsReporting(false);
      setReportModalCommentId(null);
    }
  };

  // 6. Update Comment (Edit)
  const handleUpdateComment = async () => {
    if (!editText.trim() || !editingCommentId) return;

    try {
      const res = await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
        commentbody: editText,
      });
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setTranslations((prev) => {
          const next = { ...prev };
          delete next[editingCommentId];
          return next;
        });
        setEditingCommentId(null);
        setEditText("");
        showSuccessMsg("Comment updated!");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to update comment.";
      showModerationAlert(errorMsg);
    }
  };

  // 7. Delete Comment
  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        showSuccessMsg("Comment deleted.");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  if (loading) {
    return <div className="p-4 text-zinc-500 animate-pulse">Loading comments...</div>;
  }

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100 max-w-4xl px-3 sm:px-0">
      {/* Header & Comment Count + Preferred Target Language Selection */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 pl-2 sm:pl-0">
          {comments.length} Comments
        </h2>

        {/* User-Selectable Preferred Target Language */}
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl">
          <Languages className="w-4 h-4 text-red-600 dark:text-red-500 shrink-0" />
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Target Language:</span>
          <select
            value={preferredTargetLang}
            onChange={(e) => {
              const newLang = e.target.value;
              setPreferredTargetLang(newLang);
              if (typeof window !== "undefined") {
                localStorage.setItem("user_preferred_target_lang", newLang);
              }
            }}
            className="bg-transparent text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none cursor-pointer"
          >
            {TARGET_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Banner for signed-in accounts without a channel */}
      {user && !user.channelname && (
        <div className="flex items-center justify-between gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 text-zinc-900 dark:text-zinc-100">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-sm">Create a channel to comment</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">You need to create a YouTube channel before posting comments on videos.</p>
            </div>
          </div>
          <Button
            onClick={() => setIsCreateChannelOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-full px-4 shrink-0 cursor-pointer"
          >
            Create Channel
          </Button>
        </div>
      )}

      {/* Comment Input Box for Signed-In Users */}
      {user ? (
        <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
          <Avatar className="w-10 h-10 border border-zinc-200 dark:border-zinc-700">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback className="bg-red-600 text-white font-bold">
              {(user.channelname || user.name)?.[0]?.toUpperCase() || "C"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Add a respectful comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-none focus-visible:ring-0 focus-visible:border-red-600 dark:focus-visible:border-red-500"
            />

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              {/* Optional Location Toggle */}
              <button
                type="button"
                onClick={() => setShareLocation(!shareLocation)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                  shareLocation
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 font-semibold"
                    : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {shareLocation
                  ? `📍 Attach Location (${userLocation.city}, ${userLocation.country})`
                  : "Attach Location"}
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewComment("")}
                  disabled={!newComment.trim() || isSubmitting}
                  className="rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-5"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                    </span>
                  ) : (
                    "Comment"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          Want to join the discussion? <button onClick={handlegooglesignin} className="text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer">Sign in</button> to post comments.
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-4 pt-2">
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-6">
            No comments yet. Be the first to start the discussion!
          </p>
        ) : (
          comments.map((comment) => {
            const authorName =
              comment.userid?.channelname ||
              comment.usercommented ||
              comment.userid?.name ||
              "Channel";
            const authorAvatar = comment.userid?.image || "";
            const isAuthor = user && (user._id === comment.userid?._id || user._id === comment.userid);

            // Likes & Dislikes state
            const likesCount = comment.likes?.length || 0;
            const dislikesCount = comment.dislikes?.length || 0;
            const userHasLiked = user && comment.likes?.includes(user._id);
            const userHasDisliked = user && comment.dislikes?.includes(user._id);

            // Translation state
            const transState = translations[comment._id];

            return (
              <div
                key={comment._id}
                className={`flex gap-4 p-3 rounded-2xl transition-all ${
                  comment.isFlagged
                    ? "bg-amber-500/5 border border-amber-500/20"
                    : "hover:bg-zinc-100/80 dark:hover:bg-zinc-900/50"
                }`}
              >
                <Avatar className="w-10 h-10 flex-shrink-0 border border-zinc-200 dark:border-zinc-800">
                  <AvatarImage src={authorAvatar} />
                  <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs">
                    {authorName[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* User Meta Row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      {authorName}
                      {(comment.userid?.plan === "Gold" || (isAuthor && user?.plan === "Gold")) && (
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-amber-300 select-none">
                          <Crown className="w-3 h-3 fill-black text-black" />
                          VIP GOLD
                        </span>
                      )}
                    </span>

                    {/* Optional Location Badge (Privacy Aware) */}
                    {comment.showLocation && comment.location?.city && (
                      <span className="text-[11px] font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500" />
                        {comment.location.city}
                        {comment.location.country ? `, ${comment.location.country}` : ""}
                      </span>
                    )}

                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {comment.createdAt || comment.commentedon
                        ? `${formatDistanceToNow(new Date(comment.createdAt || comment.commentedon))} ago`
                        : "recently"}
                    </span>

                    {/* Flagged Status Indicator */}
                    {comment.isFlagged && (
                      <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Flag className="w-2.5 h-2.5" /> Flagged for review
                      </span>
                    )}
                  </div>

                  {/* Comment Body / Edit Mode */}
                  {editingCommentId === comment._id ? (
                    <div className="space-y-2 my-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={handleUpdateComment}
                          disabled={!editText.trim()}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full text-xs"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                          className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active Translation or Original Text */}
                      <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal">
                        {transState?.active ? (
                          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 my-1 space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                Translated to {transState.targetFlag || "🌐"} {transState.targetName || "Preferred Language"}:
                              </span>
                              <select
                                value={transState.targetCode || preferredTargetLang}
                                onChange={(e) => handleTranslate(comment, e.target.value)}
                                className="bg-white/80 dark:bg-zinc-800/80 border border-blue-500/30 rounded px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300 focus:outline-none cursor-pointer font-medium"
                              >
                                {TARGET_LANGUAGES.map((l) => (
                                  <option key={l.code} value={l.code} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                                    {l.flag} {l.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <p className="text-sm text-zinc-900 dark:text-white font-normal pt-0.5">
                              {transState.text}
                            </p>
                          </div>
                        ) : (
                          <p>{comment.commentbody}</p>
                        )}
                      </div>

                      {/* Interactive Action Bar (Like, Dislike, Translate, Report, Edit, Delete) */}
                      <div className="flex items-center gap-4 mt-2.5 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(comment._id)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            userHasLiked
                              ? "text-red-600 font-bold"
                              : "hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${userHasLiked ? "fill-red-600" : ""}`} />
                          <span>{likesCount > 0 ? likesCount : ""}</span>
                        </button>

                        {/* Dislike Button */}
                        <button
                          onClick={() => handleDislike(comment._id)}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                            userHasDisliked
                              ? "text-zinc-900 dark:text-white font-bold"
                              : "hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          <ThumbsDown
                            className={`w-3.5 h-3.5 ${userHasDisliked ? "fill-current" : ""}`}
                          />
                          <span>{dislikesCount > 0 ? dislikesCount : ""}</span>
                        </button>

                        {/* Translate Action Button into User-Selected Target Language */}
                        <button
                          onClick={() => handleTranslate(comment)}
                          disabled={transState?.loading}
                          title={`Translate comment into ${TARGET_LANGUAGES.find((l) => l.code === preferredTargetLang)?.name || "Preferred Language"}`}
                          className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-blue-500 transition-colors cursor-pointer font-medium"
                        >
                          {transState?.loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          ) : (
                            <Languages className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          <span>
                            {transState?.active
                              ? "Show Original"
                              : `Translate (${TARGET_LANGUAGES.find((l) => l.code === preferredTargetLang)?.name || "Preferred Language"})`}
                          </span>
                        </button>

                        {/* Report Button */}
                        {user && !isAuthor && (
                          <button
                            onClick={() => setReportModalCommentId(comment._id)}
                            className="flex items-center gap-1 hover:text-amber-500 transition-colors cursor-pointer font-medium"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            <span>Report</span>
                          </button>
                        )}

                        {/* Edit & Delete Controls for Comment Owner */}
                        {isAuthor && (
                          <div className="flex gap-3 ml-auto border-l border-zinc-200 dark:border-zinc-800 pl-3">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment._id);
                                setEditText(comment.commentbody);
                              }}
                              className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(comment._id)}
                              className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Community Moderation Report Modal */}
      {reportModalCommentId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-500" /> Report Comment
              </h3>
              <button
                onClick={() => setReportModalCommentId(null)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Please select the reason for reporting this comment. Our automated moderation pipeline will flag it for admin review.
            </p>

            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedReason === reason
                      ? "border-red-500 bg-red-500/10 font-semibold text-zinc-900 dark:text-white"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-red-600"
                  />
                  <span className="text-xs">{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="ghost"
                onClick={() => setReportModalCommentId(null)}
                className="rounded-full text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReport}
                disabled={isReporting}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-semibold px-5"
              >
                {isReporting ? "Reporting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && typeof window !== "undefined" && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold px-5 py-3 rounded-full shadow-2xl z-[9999] flex items-center gap-2.5 border border-zinc-800 dark:border-zinc-200 backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-none">
          <Check className="w-4 h-4 text-green-400 dark:text-green-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}

      {isCreateChannelOpen && (
        <Channeldialogue setisdialogeopen={setIsCreateChannelOpen} />
      )}
    </div>
  );
};

export default Comments;
