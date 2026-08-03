// app/api/admin/fix-stuck-payment/route.js
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

    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: "paymentId مطلوب" },
        { status: 400 }
      );
    }

    await dbConnect();

    // نجيب تفاصيل الدفعة العالقة من Pi نفسها
    const paymentDetails = await piClient.getPayment(paymentId);
    console.log("Stuck payment details:", JSON.stringify(paymentDetails));

    if (paymentDetails.status?.developer_completed) {
      return NextResponse.json(
        { success: false, message: "هذي الدفعة مكتملة أصلاً عند Pi، لا حاجة لأي إجراء" },
        { status: 400 }
      );
    }

    const recipientAddress = paymentDetails.to_address;
    const amount = paymentDetails.amount;

    if (!recipientAddress || !amount) {
      return NextResponse.json(
        { success: false, message: "بيانات الدفعة العالقة ناقصة (to_address/amount)" },
        { status: 400 }
      );
    }

    let txid = paymentDetails.transaction?.txid;

    // لو المعاملة ما انبعتت أصلاً على البلوكتشين، نبعتها الآن
    if (!txid) {
      txid = await submitA2UPayment({
        paymentIdentifier: paymentId,
        recipientAddress,
        amount,
      });
    }

    // نكمل الدفعة عند Pi بمعرّف المعاملة
    const completed = await piClient.completePayment(paymentId, txid);

    await Log.create({
      action: "Fixed Stuck A2U Payment",
      level: "info",
      actorUid: "admin",
      details: { paymentId, txid },
    });

    console.log("HTTP Status: 200 - Stuck payment resolved:", paymentId, txid);
    return NextResponse.json(
      { success: true, message: "تم حل الدفعة العالقة بنجاح", data: { paymentId, txid, completed } },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error fixing stuck payment:", error.message);
    return NextResponse.json(
      { success: false, message: "فشل حل الدفعة العالقة", error: error.message },
      { status: 500 }
    );
  }
}
