// models/Order.js
import mongoose from "mongoose";
import crypto from "crypto";

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    buyer: {
      uid: { type: String, required: true },
      username: { type: String, default: "" },
    },
    seller: {
      uid: { type: String, required: true },
      username: { type: String, default: "" },
    },
    product: {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
    },
    payment: {
      paymentId: { type: String, default: null },
      amount: { type: Number, required: true },
      status: { type: String, default: "pending" },
      network: {
        type: String,
        default: process.env.PI_NETWORK_ENV === "mainnet" ? "mainnet" : "testnet",
      },
      txid: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "completed", "cancelled", "refund_requested", "refunded"],
      default: "pending",
    },
    fulfillmentStatus: {
      type: String,
      enum: ["order_received", "processing", "shipped", "delivered"],
      default: "order_received",
    },
    trackingNumber: { type: String, default: "" },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
