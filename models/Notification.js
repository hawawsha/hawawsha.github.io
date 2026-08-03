// models/Notification.js
import mongoose from "mongoose";
import crypto from "crypto";

const NotificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    uid: { type: String, required: true },
    type: { type: String, default: "payment" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: {
      orderId: { type: String, default: null },
      amount: { type: Number, default: null },
      status: { type: String, default: null },
      createdAt: { type: Date, default: Date.now },
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
