import mongoose from "mongoose";

const downloadSchema = mongoose.Schema(
  {
    userid: { type: String, required: true },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles", required: true },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("download", downloadSchema);
