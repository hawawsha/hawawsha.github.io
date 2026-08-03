// models/Refund.js
import mongoose from "mongoose";
import crypto from "crypto";

const RefundSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    orderId: { type: String, required: true, index: true },
    paymentId: { type: String, default: null }, // معرّف دفعة الشراء الأصلية (U2A)

    buyerUid: { type: String, required: true },
    buyerUsername: { type: String, default: "" },
    sellerUid: { type: String, required: true },
    sellerUsername: { type: String, default: "" },

    productName: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "approved", "processing", "completed", "rejected", "failed", "cancelled"],
      default: "pending",
    },

    // بيانات معاملة الاسترجاع الفعلية (A2U) بعد التنفيذ
    transactionId: { type: String, default: null }, // معرّف دفعة الاسترجاع من Pi Platform API
    txid: { type: String, default: null }, // معرّف المعاملة على البلوكتشين

    retryCount: { type: Number, default: 0 },

    approvedBy: { type: String, default: null }, // "admin" أو uid البائع
    approvedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Refund || mongoose.model("Refund", RefundSchema);
