// app/api/orders/[orderId]/fulfillment/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Notification from "@/models/Notification";

const STAGE_ORDER = ["order_received", "processing", "shipped", "delivered"];

const STAGE_MESSAGES = {
  order_received: "تم استلام طلبك وهو قيد المراجعة",
  processing: "جاري تجهيز طلبك",
  shipped: "تم شحن طلبك",
  delivered: "تم تسليم طلبك بنجاح",
};

export async function PATCH(request, { params }) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log("HTTP Status: 401 - Invalid or missing admin secret");
      return NextResponse.json(
        { success: false, message: "غير مصرح لك" },
        { status: 401 }
      );
    }

    const { orderId } = params;
    const { fulfillmentStatus, trackingNumber } = await request.json();

    if (!STAGE_ORDER.includes(fulfillmentStatus)) {
      console.log("HTTP Status: 400 - Invalid fulfillmentStatus:", fulfillmentStatus);
      return NextResponse.json(
        { success: false, message: "قيمة fulfillmentStatus غير صالحة" },
        { status: 400 }
      );
    }

    await dbConnect();

    const order = await Order.findOne({ orderId });
    if (!order) {
      console.log("HTTP Status: 404 - Order not found:", orderId);
      return NextResponse.json(
        { success: false, message: "لم يتم العثور على الطلب" },
        { status: 404 }
      );
    }

    order.fulfillmentStatus = fulfillmentStatus;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (fulfillmentStatus === "shipped") order.shippedAt = new Date();
    if (fulfillmentStatus === "delivered") order.deliveredAt = new Date();

    await order.save();

    try {
      await Notification.create({
        uid: order.buyer.uid,
        type: "order",
        title: "Order status updated",
        message: STAGE_MESSAGES[fulfillmentStatus] || "تم تحديث حالة طلبك",
        data: { orderId, fulfillmentStatus },
      });
    } catch (notifError) {
      console.log("Warning: failed to create notification:", notifError.message);
    }

    console.log("HTTP Status: 200 - Fulfillment status updated:", orderId, "->", fulfillmentStatus);
    return NextResponse.json(
      { success: true, message: "تم تحديث حالة الطلب بنجاح", data: order },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error updating fulfillment status:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحديث حالة الطلب", error: error.message },
      { status: 500 }
    );
  }
}
