// models/Product.js
import mongoose from "mongoose";
import crypto from "crypto";

const ProductSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    priceCurrency: { type: String, default: "PI" },
    category: { type: String, default: "" },
    images: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    seller: {
      uid: { type: String, required: true },
      username: { type: String, required: true },
      walletAddress: { type: String, default: "" },
    },
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    status: { type: String, default: "active" },
    saleType: {
      type: String,
      enum: ["instant", "contact"],
      default: "instant",
    },
    contactInfo: { type: String, default: "" }, // رقم واتساب أو رابط تواصل، فقط عند saleType = "contact"
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
