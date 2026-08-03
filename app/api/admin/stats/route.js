// app/api/admin/stats/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";

export async function GET(request) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log("HTTP Status: 401 - Invalid or missing admin secret");
      return NextResponse.json(
        { success: false, message: "غير مصرح لك" },
        { status: 401 }
      );
    }

    await dbConnect();

    const completedOrders = await Order.find({ status: "completed" });

    const totalSales = completedOrders.reduce(
      (sum, o) => sum + (o.payment?.amount || 0),
      0
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newOrdersCount = await Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const pendingOrdersCount = await Order.countDocuments({ status: "pending" });

    const productCounts = {};
    const allOrders = await Order.find({}, "product.name product.productId");
    allOrders.forEach((o) => {
      const key = o.product?.productId;
      if (!key) return;
      if (!productCounts[key]) {
        productCounts[key] = { name: o.product.name, count: 0 };
      }
      productCounts[key].count += 1;
    });

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    console.log("HTTP Status: 200 - Stats computed successfully");
    return NextResponse.json(
      {
        success: true,
        data: {
          totalSales,
          totalCompletedOrders: completedOrders.length,
          newOrdersCount,
          pendingOrdersCount,
          topProducts,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error computing stats:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء حساب الإحصائيات", error: error.message },
      { status: 500 }
    );
  }
}
