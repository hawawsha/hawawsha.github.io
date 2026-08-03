// models/Balance.js
import mongoose from "mongoose";

const BalanceSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    totalSales: { type: Number, default: 0 },
    totalRefunds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Balance || mongoose.model("Balance", BalanceSchema);
