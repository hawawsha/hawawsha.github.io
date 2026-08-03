// models/Log.js
import mongoose from "mongoose";

const LogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // مثل: "Refund Requested", "Pi API Error"
    level: { type: String, enum: ["info", "warning", "error"], default: "info" },
    refundId: { type: String, default: null },
    orderId: { type: String, default: null },
    actorUid: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Log || mongoose.model("Log", LogSchema);
