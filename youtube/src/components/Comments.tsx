"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
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

const Comments = ({ videoId }: { videoId: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Privacy & Location
  const [shareLocation, setShareLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ city: string; country: string }>({
    city: "Hyderabad",
    country: "India",
  });

  // Toast / Moderation Alert
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Translation State: Map of commentId -> { translatedText, isTranslating, isTranslated, originalLanguage }
  const [translations, setTranslations] = useState<{
    [key: string]: { text: string; loading: boolean; active: boolean; lang?: string };
  }>({});

  // Report Modal State
  const [reportModalCommentId, setReportModalCommentId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [isReporting, setIsReporting] = useState(false);

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

  const showModerationAlert = (msg: string) => {
    setModerationError(msg);
    setTimeout(() => setModerationError(null), 7000);
  };

  const showSuccessMsg = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

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

  // 1. Submit Comment with Moderation Pipeline
  const handleSubmitComment = async () => {
    if (!user) {
      alert("Please sign in to post comments.");
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    setModerationError(null);

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name || user.channelname || "User",
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
        title: `💬 ${user.name || user.channelname || "User"} commented on your video.`,
        message: `Commented: "${newComment.substring(0, 35)}${newComment.length > 35 ? "..." : ""}"`,
        actionUrl: `/watch/${videoId}`,
      });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to post comment. Please try again.";
      showModerationAlert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Like Comment (Optimistic UI update)
  const handleLike = async (commentId: string) => {
    if (!user) {
      alert("Please sign in to like comments.");
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
      alert("Please sign in to dislike comments.");
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

  // 4. Translate Comment (Only 1 active translation box open at once)
  const handleTranslate = async (comment: Comment) => {
    const commentId = comment._id;
    const currentTrans = translations[commentId];

    // Toggle off if already translated and active
    if (currentTrans && currentTrans.active) {
      setTranslations((prev) => ({
        ...prev,
        [commentId]: { ...prev[commentId], active: false },
      }));
      return;
    }

    // Helper to deactivate all other translation boxes so only 1 remains open
    const deactivateOthers = (prev: any) => {
      const next: any = {};
      Object.keys(prev).forEach((key) => {
        next[key] = { ...prev[key], active: false };
      });
      return next;
    };

    // Toggle on if text already cached
    if (currentTrans && currentTrans.text) {
      setTranslations((prev) => ({
        ...deactivateOthers(prev),
        [commentId]: { ...prev[commentId], active: true },
      }));
      return;
    }

    // Fetch translation
    setTranslations((prev) => ({
      ...deactivateOthers(prev),
      [commentId]: { text: "", loading: true, active: false },
    }));

    try {
      const encodedText = encodeURIComponent(comment.commentbody);
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=autodetect|en`
      );
      const data = await res.json();

      let translated = data?.responseData?.translatedText || comment.commentbody;
      if (
        !translated ||
        translated.toUpperCase().includes("PLEASE SELECT TWO DISTINCT LANGUAGES") ||
        data?.responseStatus === "403" ||
        data?.responseStatus === 403
      ) {
        translated = comment.commentbody;
      }

      const detectedLang = data?.responseData?.detectedLanguage || "auto";

      setTranslations((prev) => ({
        ...deactivateOthers(prev),
        [commentId]: {
          text: translated,
          loading: false,
          active: true,
          lang: detectedLang,
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
          lang: "en",
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
    setModerationError(null);

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
      {/* Header & Comment Count */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 pl-2 sm:pl-0">
          {comments.length} Comments
        </h2>
      </div>

      {/* Moderation Warning Toast / Banner */}
      {moderationError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700 dark:text-red-300">Comment Moderation Guard</p>
            <p className="mt-0.5">{moderationError}</p>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Comment Input Box (Only rendered for Paid Membership Tier Accounts - Read-Only for Free Tier) */}
      {user && user.plan && user.plan !== "Free" && (
        <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
          <Avatar className="w-10 h-10 border border-zinc-200 dark:border-zinc-700">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback className="bg-red-600 text-white font-bold">
              {user.name?.[0] || user.channelname?.[0] || "U"}
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
              comment.userid?.name ||
              comment.userid?.channelname ||
              comment.usercommented ||
              "Anonymous";
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
                          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 my-1">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Translated to English:
                            </p>
                            <p className="text-sm text-zinc-900 dark:text-white">
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

                        {/* Translate Toggle (Disabled for pure English or Emojis) */}
                        {(() => {
                          const isOnlyEnglishOrEmoji = (text: string) => {
                            if (!text || !text.trim()) return true;

                            // 1. Check for non-ASCII foreign characters (e.g. á, é, í, ó, ú, ñ, ¿, ¡, or non-Latin scripts)
                            const nonEmojiText = text.replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, "");
                            if (/[^\x00-\x7F]/.test(nonEmojiText)) {
                              return false;
                            }

                            // 2. Extract normalized words
                            const words = text.toLowerCase().match(/[a-z]+/g) || [];
                            if (words.length === 0) return true;

                            // Spanish & non-English indicator words
                            const nonEnglishWords = new Set([
                              "como", "el", "la", "los", "las", "del", "un", "una", "unos", "unas",
                              "poderosa", "poderoso", "infierno", "que", "para", "por", "con", "sin",
                              "hola", "gracias", "mucho", "amigo", "amiga", "bien", "todo", "toda",
                              "todos", "todas", "pero", "mas", "estoy", "esta", "este", "muy",
                              "tambien", "siempre", "nunca", "hacer", "hace", "tiempo", "vida", "amor",
                              "bueno", "buena", "sobre", "entre", "cuando", "donde", "quien", "porque",
                              "asi", "aqui", "alli", "alla", "mismo", "misma", "otro", "otra", "nada",
                              "nadie", "algo", "alguien", "chapeau", "bonjour", "merci", "gut", "danke",
                              "ciao", "bella", "grazie"
                            ]);

                            const hasForeignWord = words.some((w) => nonEnglishWords.has(w));
                            if (hasForeignWord) return false;

                            return true;
                          };

                          const isEnglishOrEmoji = isOnlyEnglishOrEmoji(comment.commentbody);

                          return (
                            <button
                              onClick={() => !isEnglishOrEmoji && handleTranslate(comment)}
                              disabled={isEnglishOrEmoji || transState?.loading}
                              title={isEnglishOrEmoji ? "Comment is in English / Emojis (No translation needed)" : "Translate comment to English"}
                              className={`flex items-center gap-1 transition-colors ${
                                isEnglishOrEmoji
                                  ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50"
                                  : "text-zinc-500 dark:text-zinc-400 hover:text-blue-500 cursor-pointer font-medium"
                              }`}
                            >
                              {transState?.loading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Languages className="w-3.5 h-3.5" />
                              )}
                              <span>{transState?.active ? "Show Original" : "Translate"}</span>
                            </button>
                          );
                        })()}

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
    </div>
  );
};

export default Comments;
