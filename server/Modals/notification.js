import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    actionUrl: { type: String, default: "" },
    read: { type: Boolean, default: false },
    senderName: { type: String, default: "" },
    senderImage: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
