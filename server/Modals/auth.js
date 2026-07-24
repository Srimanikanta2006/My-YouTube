import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  plan: { type: String, default: "Free" },
  dailyDownloadsCount: { type: Number, default: 0 },
  lastDownloadDate: { type: Date },
  subscriptionStartDate: { type: Date },
  subscriptionExpiresAt: { type: Date },
  theme: { type: String, default: "dark" },
  lastLocation: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    device: { type: String },
  },
  knownLocations: [
    {
      city: { type: String },
      state: { type: String },
      country: { type: String },
      device: { type: String },
      verifiedAt: { type: Date, default: Date.now },
    },
  ],
  loginOtp: { type: String },
  otpExpiresAt: { type: Date },
  pendingLoginLocation: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    device: { type: String },
  },
});

export default mongoose.model("user", userschema);