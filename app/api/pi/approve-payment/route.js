export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import piClient from "@/lib/pi/config";

export async function POST(request) {
  try {
    const { paymentId, orderId } = await request.json();

    if (!paymentId || !orderId) {
      console.log("HTTP Status: 400 - Missing paymentId or orderId");
      return NextResponse.json(
        { success: false, message: "paymentId و orderId مطلوبان" },
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

    const approvedPayment = await piClient.approvePayment(paymentId);

    order.payment.paymentId = paymentId;
    order.payment.status = "approved";
    order.status = "approved";

    await order.save();

    console.log("HTTP Status: 200 - Payment approved successfully:", paymentId);
    return NextResponse.json(
      { success: true, message: "تمت الموافقة على الدفع بنجاح", data: approvedPayment },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error approving payment:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء الموافقة على الدفع", error: error.message },
      { status: 500 }
    );
  }
}
