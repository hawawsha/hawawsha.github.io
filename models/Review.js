// models/Review.js
import mongoose from "mongoose";
import crypto from "crypto";

const ReviewSchema = new mongoose.Schema(
  {
    reviewId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    productId: { type: String, required: true, index: true },
    buyerUid: { type: String, required: true },
    buyerUsername: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    verifiedPurchase: { type: Boolean, default: false }, // اشترى فعلياً عبر Pi Network
  },
  { timestamps: true }
);

// مستخدم واحد يقيّم نفس المنتج مرة وحدة بس
ReviewSchema.index({ productId: 1, buyerUid: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
