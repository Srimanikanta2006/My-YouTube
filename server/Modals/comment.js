import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String, required: true },
    usercommented: { type: String },
    language: { type: String, default: "en" },
    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },
    showLocation: { type: Boolean, default: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    reports: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        reason: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isFlagged: { type: Boolean, default: false },
    moderationStatus: { type: String, enum: ["approved", "flagged", "rejected"], default: "approved" },
    commentedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Database Optimization Indexes for query performance and pagination
commentschema.index({ videoid: 1, createdAt: -1 });
commentschema.index({ userid: 1, createdAt: -1 });
commentschema.index({ isFlagged: 1 });

export default mongoose.model("comment", commentschema);