// app/api/admin/cleanup/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Review from "@/models/Review";
import Refund from "@/models/Refund";
import Notification from "@/models/Notification";
import Log from "@/models/Log";
import Balance from "@/models/Balance";

const MODELS = {
  products: Product,
  orders: Order,
  reviews: Review,
  refunds: Refund,
  notifications: Notification,
  logs: Log,
  balances: Balance,
};

export async function POST(request) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log("HTTP Status: 401 - Invalid or missing admin secret");
      return NextResponse.json(
        { success: false, message: "غير مصرح لك" },
        { status: 401 }
      );
    }

    const { collections, confirm } = await request.json();

    if (confirm !== "DELETE") {
      return NextResponse.json(
        { success: false, message: "يجب كتابة DELETE بالضبط للتأكيد" },
        { status: 400 }
      );
    }

    if (!Array.isArray(collections) || collections.length === 0) {
      return NextResponse.json(
        { success: false, message: "اختر مجموعة واحدة على الأقل" },
        { status: 400 }
      );
    }

    await dbConnect();

    const results = {};
    for (const key of collections) {
      const Model = MODELS[key];
      if (!Model) continue;
      const result = await Model.deleteMany({});
      results[key] = result.deletedCount;
      console.log(`HTTP Status: 200 - Cleaned ${key}:`, result.deletedCount);
    }

    return NextResponse.json(
      { success: true, message: "تم تنظيف البيانات المحددة بنجاح", data: results },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error cleaning up:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء التنظيف", error: error.message },
      { status: 500 }
    );
  }
}
