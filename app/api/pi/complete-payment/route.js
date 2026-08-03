export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import piClient from "@/lib/pi/config";

export async function POST(request) {
  try {
    const { paymentId, txid } = await request.json();

    if (!paymentId || !txid) {
      console.log("HTTP Status: 400 - Missing paymentId or txid");
      return NextResponse.json(
        { success: false, message: "paymentId و txid مطلوبان" },
        { status: 400 }
      );
    }

    await dbConnect();

    // نكمل الدفع مع Pi Network أولاً بأي حال، حتى لو الطلب غير موجود محلياً
    // (مهم لحل أي دفعات عالقة قديمة من قبل ربط قاعدة البيانات الصحيحة)
    const completedPayment = await piClient.completePayment(paymentId, txid);

    const order = await Order.findOne({ "payment.paymentId": paymentId });

    if (order) {
      order.payment.status = "completed";
      order.payment.txid = txid;
      order.status = "completed";
      await order.save();
      console.log("HTTP Status: 200 - Payment completed and order updated:", paymentId);
    } else {
      console.log("HTTP Status: 200 - Payment completed with Pi, but no matching local order:", paymentId);
    }

    return NextResponse.json(
      { success: true, message: "تم إتمام الدفع بنجاح", data: completedPayment },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error completing payment:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إتمام الدفع", error: error.message },
      { status: 500 }
    );
  }
}
