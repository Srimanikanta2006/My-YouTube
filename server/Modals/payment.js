import mongoose from "mongoose";

const paymentSchema = mongoose.Schema(
  {
    userId: { type: String, required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String },
    signature: { type: String },
    plan: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "created" },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("payment", paymentSchema);
