// app/api/admin/test-payment/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import piClient from "@/lib/pi/config";
import { submitA2UPayment } from "@/lib/pi/wallet";
import Log from "@/models/Log";
import dbConnect from "@/lib/dbConnect";

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

    const { uid, amount } = await request.json();

    if (!uid || !amount) {
      console.log("HTTP Status: 400 - Missing uid or amount");
      return NextResponse.json(
        { success: false, message: "uid و amount مطلوبان" },
        { status: 400 }
      );
    }

    await dbConnect();

    const created = await piClient.createA2UPayment({
      amount,
      memo: "Test A2U payment - Souq Pi",
      metadata: { type: "manual_test" },
      uid,
    });

    const paymentId = created.identifier;

    const paymentDetails = await piClient.getPayment(paymentId);
    const recipientAddress = paymentDetails.to_address;

    if (!recipientAddress) {
      throw new Error("لم يتم الحصول على عنوان محفظة المستلم من Pi Network");
    }

    const txid = await submitA2UPayment({
      paymentIdentifier: paymentId,
      recipientAddress,
      amount,
    });

    await piClient.completePayment(paymentId, txid);

    try {
      await Log.create({
        action: "Manual Test A2U Payment",
        level: "info",
        actorUid: "admin",
        details: { uid, amount, paymentId, txid },
      });
    } catch (logErr) {
      console.log("Warning: failed to write log:", logErr.message);
    }

    console.log("HTTP Status: 200 - Test payment completed:", paymentId, txid);
    return NextResponse.json(
      { success: true, message: "تم إرسال الدفعة الاختبارية بنجاح", data: { paymentId, txid } },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error sending test payment:", error.message);
    return NextResponse.json(
      { success: false, message: "فشل إرسال الدفعة الاختبارية", error: error.message },
      { status: 500 }
    );
  }
}
