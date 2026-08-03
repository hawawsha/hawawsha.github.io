// app/api/orders/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Notification from "@/models/Notification";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerUid = searchParams.get("buyerUid");
    const adminSecret = request.headers.get("x-admin-secret");

    await dbConnect();

    if (buyerUid) {
      const orders = await Order.find({ "buyer.uid": buyerUid }).sort({ createdAt: -1 });
      console.log("HTTP Status: 200 - Fetched orders for buyer:", buyerUid, "count:", orders.length);
      return NextResponse.json({ success: true, data: orders }, { status: 200 });
    }

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log("HTTP Status: 401 - Invalid or missing admin secret for orders list");
      return NextResponse.json(
        { success: false, message: "غير مصرح لك" },
        { status: 401 }
      );
    }

    const orders = await Order.find({ status: "completed" }).sort({ createdAt: -1 });
    console.log("HTTP Status: 200 - Fetched all completed orders:", orders.length);
    return NextResponse.json({ success: true, data: orders }, { status: 200 });
  } catch (error) {
    console.log("HTTP Status: 500 - Error fetching orders:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب الطلبات", error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      console.log("HTTP Status: 400 - Missing orderId or status");
      return NextResponse.json(
        { success: false, message: "orderId و status مطلوبان" },
        { status: 400 }
      );
    }

    const allowedStatuses = ["cancelled", "pending", "approved", "completed"];
    if (!allowedStatuses.includes(status)) {
      console.log("HTTP Status: 400 - Invalid status:", status);
      return NextResponse.json(
        { success: false, message: "قيمة status غير صالحة" },
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

    order.status = status;
    if (status === "cancelled") {
      order.payment.status = "cancelled";
    }
    await order.save();

    console.log("HTTP Status: 200 - Order status updated:", orderId, "->", status);
    return NextResponse.json(
      { success: true, message: "تم تحديث حالة الطلب", data: order },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error updating order status:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحديث حالة الطلب", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("Received order request body:", JSON.stringify(body));

    const { productId, buyerUid, buyerUsername } = body;

    if (!productId || !buyerUid) {
      console.log(
        "HTTP Status: 400 - Missing productId or buyerUid | productId:",
        productId,
        "| buyerUid:",
        buyerUid
      );
      return NextResponse.json(
        { success: false, message: "productId و buyerUid مطلوبان" },
        { status: 400 }
      );
    }

    await dbConnect();

    // productId هنا هو الـ UUID المخزّن في حقل product.productId، وليس الـ Mongo _id
    const product = await Product.findOne({ productId });

    if (!product) {
      console.log("HTTP Status: 404 - Product not found:", productId);
      return NextResponse.json(
        { success: false, message: "المنتج غير موجود" },
        { status: 404 }
      );
    }

    const order = await Order.create({
      buyer: {
        uid: buyerUid,
        username: buyerUsername || buyerUid,
      },
      seller: {
        uid: product.seller?.uid || "souq-pi",
        username: product.seller?.username || "Souq Pi",
      },
      product: {
        productId: product.productId,
        name: product.name,
        price: product.price,
      },
      payment: {
        amount: product.price,
        status: "pending",
      },
      status: "pending",
    });

    console.log("HTTP Status: 201 - Order created:", order.orderId);

    // إنشاء إشعار للمشتري بنفس نمط البيانات الحقيقية الموجودة بالقاعدة
    try {
      await Notification.create({
        uid: order.buyer.uid,
        type: "payment",
        title: "Payment pending",
        message: `Payment of ${order.payment.amount} PI for order ${order.orderId}`,
        data: {
          orderId: order.orderId,
          amount: order.payment.amount,
          status: order.payment.status,
        },
      });
    } catch (notifError) {
      console.log("Warning: failed to create notification:", notifError.message);
    }

    return NextResponse.json(
      { success: true, message: "تم إنشاء الطلب بنجاح", data: order },
      { status: 201 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error creating order:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إنشاء الطلب", error: error.message },
      { status: 500 }
    );
  }
}
