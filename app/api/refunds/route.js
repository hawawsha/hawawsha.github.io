// app/api/refunds/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Refund from "@/models/Refund";
import Notification from "@/models/Notification";
import Log from "@/models/Log";

const REFUND_WINDOW_DAYS = 7;
const ELIGIBLE_ORDER_STATUSES = ["completed"]; // نظامنا رقمي فوري، فلا يوجد "shipped/processing"

async function writeLog(action, level, refundId, orderId, actorUid, details) {
  try {
    await Log.create({ action, level, refundId, orderId, actorUid, details });
  } catch (err) {
    console.log("Warning: failed to write log:", err.message);
  }
}

export async function POST(request) {
  try {
    const { orderId, buyerUid, reason } = await request.json();

    if (!orderId || !buyerUid) {
      console.log("HTTP Status: 400 - Missing orderId or buyerUid");
      return NextResponse.json(
        { success: false, message: "orderId و buyerUid مطلوبان" },
        { status: 400 }
      );
    }

    await dbConnect();

    const order = await Order.findOne({ orderId });

    // 1) الطلب موجود
    if (!order) {
      console.log("HTTP Status: 404 - Order not found:", orderId);
      return NextResponse.json(
        { success: false, message: "لم يتم العثور على الطلب" },
        { status: 404 }
      );
    }

    // أمان: المشتري يقدر يطلب استرجاع لطلبه هو فقط
    if (order.buyer.uid !== buyerUid) {
      console.log("HTTP Status: 403 - Buyer mismatch for order:", orderId);
      await writeLog("Refund Request Denied - Ownership Mismatch", "warning", null, orderId, buyerUid, {});
      return NextResponse.json(
        { success: false, message: "هذا الطلب لا يخصك" },
        { status: 403 }
      );
    }

    // 2) الدفع تم بنجاح + 6) حالة الطلب تسمح بالاسترجاع
    if (!ELIGIBLE_ORDER_STATUSES.includes(order.status) || order.payment.status !== "completed") {
      console.log("HTTP Status: 400 - Order not eligible for refund:", orderId, order.status);
      return NextResponse.json(
        { success: false, message: "لا يمكن طلب استرجاع لهذا الطلب في حالته الحالية" },
        { status: 400 }
      );
    }

    // 5) لم تنتهِ مهلة الاسترجاع
    const orderAgeDays = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (orderAgeDays > REFUND_WINDOW_DAYS) {
      console.log("HTTP Status: 400 - Refund window expired for order:", orderId);
      return NextResponse.json(
        { success: false, message: `انتهت مهلة الاسترجاع (${REFUND_WINDOW_DAYS} أيام من الشراء)` },
        { status: 400 }
      );
    }

    // 3+4) لم يُسترجع من قبل ولا يوجد طلب استرجاع آخر نشط لنفس الطلب
    const existing = await Refund.findOne({
      orderId,
      status: { $in: ["pending", "approved", "processing", "completed"] },
    });
    if (existing) {
      console.log("HTTP Status: 400 - Refund already requested for order:", orderId);
      return NextResponse.json(
        { success: false, message: "تم إرسال طلب استرجاع لهذا الطلب مسبقاً" },
        { status: 400 }
      );
    }

    const refund = await Refund.create({
      orderId: order.orderId,
      paymentId: order.payment.paymentId,
      buyerUid: order.buyer.uid,
      buyerUsername: order.buyer.username,
      sellerUid: order.seller.uid,
      sellerUsername: order.seller.username,
      productName: order.product.name,
      amount: order.payment.amount,
      reason: reason || "",
      status: "pending",
    });

    order.status = "refund_requested";
    await order.save();

    // إشعارات: تأكيد للمشتري + تنبيه للبائع
    try {
      await Notification.create({
        uid: order.buyer.uid,
        type: "refund",
        title: "Refund requested",
        message: `تم إرسال طلب استرجاع لطلب ${order.product.name}`,
        data: { orderId, amount: order.payment.amount, status: "pending" },
      });
      await Notification.create({
        uid: order.seller.uid,
        type: "refund",
        title: "New refund request",
        message: `طلب استرجاع جديد لمنتج ${order.product.name}`,
        data: { orderId, amount: order.payment.amount, status: "pending" },
      });
    } catch (notifError) {
      console.log("Warning: failed to create refund notifications:", notifError.message);
    }

    await writeLog("Refund Requested", "info", refund.refundId, orderId, buyerUid, { amount: refund.amount });

    console.log("HTTP Status: 201 - Refund request created:", refund.refundId);
    return NextResponse.json(
      { success: true, message: "تم إرسال طلب الاسترجاع بنجاح", data: refund },
      { status: 201 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error creating refund:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إرسال طلب الاسترجاع", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerUid = searchParams.get("buyerUid");
    const adminSecret = request.headers.get("x-admin-secret");

    await dbConnect();

    // طلب المشتري لطلباته الخاصة فقط - بدون كلمة سر
    if (buyerUid) {
      const refunds = await Refund.find({ buyerUid }).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, data: refunds }, { status: 200 });
    }

    // طلب إداري شامل - يتطلب كلمة سر (تُستخدم أيضاً كـ "Admin override" لصلاحيات البائع)
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log("HTTP Status: 401 - Invalid or missing admin secret for refunds list");
      return NextResponse.json(
        { success: false, message: "غير مصرح لك" },
        { status: 401 }
      );
    }

    const refunds = await Refund.find({}).sort({ createdAt: -1 });
    console.log("HTTP Status: 200 - Fetched all refunds:", refunds.length);
    return NextResponse.json({ success: true, data: refunds }, { status: 200 });
  } catch (error) {
    console.log("HTTP Status: 500 - Error fetching refunds:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب طلبات الاسترجاع", error: error.message },
      { status: 500 }
    );
  }
}
