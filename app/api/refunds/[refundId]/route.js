// app/api/refunds/[refundId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Refund from "@/models/Refund";
import Balance from "@/models/Balance";
import Notification from "@/models/Notification";
import Log from "@/models/Log";
import piClient from "@/lib/pi/config";
import { submitA2UPayment } from "@/lib/pi/wallet";

const MAX_RETRIES = 2;

async function writeLog(action, level, refundId, orderId, actorUid, details) {
  try {
    await Log.create({ action, level, refundId, orderId, actorUid, details });
  } catch (err) {
    console.log("Warning: failed to write log:", err.message);
  }
}

async function notify(uid, title, message, data) {
  try {
    await Notification.create({ uid, type: "refund", title, message, data });
  } catch (err) {
    console.log("Warning: failed to create notification:", err.message);
  }
}

/**
 * ينفّذ عملية الاسترجاع الفعلية عبر Pi Blockchain (A2U):
 * إنشاء دفعة → إيجاد عنوان المستلم → توقيع وإرسال المعاملة → إكمالها لدى Pi
 */
async function executeRefundPayment(refund) {
  const created = await piClient.createA2UPayment({
    amount: refund.amount,
    memo: `Refund for order ${refund.orderId}`,
    metadata: { orderId: refund.orderId, refundId: refund.refundId },
    uid: refund.buyerUid,
  });

  const paymentId = created.identifier;
  refund.transactionId = paymentId;
  await refund.save();

  const paymentDetails = await piClient.getPayment(paymentId);
  const recipientAddress = paymentDetails.to_address;

  if (!recipientAddress) {
    throw new Error("لم يتم الحصول على عنوان محفظة المستلم من Pi Network");
  }

  const txid = await submitA2UPayment({
    paymentIdentifier: paymentId,
    recipientAddress,
    amount: refund.amount,
  });

  refund.txid = txid;
  await refund.save();

  await piClient.completePayment(paymentId, txid);

  return { paymentId, txid };
}

export async function PATCH(request, { params }) {
  const { refundId } = params;

  try {
    const adminSecret = request.headers.get("x-admin-secret");
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log("HTTP Status: 401 - Invalid or missing admin secret");
      return NextResponse.json(
        { success: false, message: "غير مصرح لك" },
        { status: 401 }
      );
    }

    const { action, rejectionReason } = await request.json();

    if (!["approve", "reject", "retry"].includes(action)) {
      console.log("HTTP Status: 400 - Invalid action:", action);
      return NextResponse.json(
        { success: false, message: "action غير صالح" },
        { status: 400 }
      );
    }

    await dbConnect();

    const refund = await Refund.findOne({ refundId });
    if (!refund) {
      console.log("HTTP Status: 404 - Refund not found:", refundId);
      return NextResponse.json(
        { success: false, message: "طلب الاسترجاع غير موجود" },
        { status: 404 }
      );
    }

    const order = await Order.findOne({ orderId: refund.orderId });

    // ===== رفض الطلب =====
    if (action === "reject") {
      refund.status = "rejected";
      refund.rejectionReason = rejectionReason || "";
      await refund.save();

      if (order) {
        order.status = "completed"; // يرجع لحالته قبل طلب الاسترجاع
        await order.save();
      }

      await notify(refund.buyerUid, "Refund rejected", `تم رفض طلب استرجاع ${refund.productName}`, {
        orderId: refund.orderId,
        status: "rejected",
      });
      await writeLog("Refund Rejected", "info", refundId, refund.orderId, "admin", { rejectionReason });

      console.log("HTTP Status: 200 - Refund rejected:", refundId);
      return NextResponse.json({ success: true, message: "تم رفض الطلب", data: refund }, { status: 200 });
    }

    // ===== موافقة أو إعادة محاولة: تنفيذ التحويل الفعلي =====
    if (refund.status === "completed") {
      return NextResponse.json(
        { success: false, message: "تم استرجاع هذا الطلب مسبقاً" },
        { status: 400 }
      );
    }

    refund.status = "processing";
    refund.approvedBy = "admin";
    refund.approvedAt = refund.approvedAt || new Date();
    await refund.save();
    await writeLog("Refund Approved", "info", refundId, refund.orderId, "admin", {});

    let lastError = null;
    let attempt = refund.retryCount;

    while (attempt <= MAX_RETRIES) {
      try {
        const { paymentId, txid } = await executeRefundPayment(refund);

        refund.status = "completed";
        refund.completedAt = new Date();
        await refund.save();

        if (order) {
          order.status = "refunded";
          await order.save();
        }

        try {
          const balance = await Balance.findOneAndUpdate(
            { uid: refund.sellerUid },
            { $inc: { totalRefunds: refund.amount } },
            { upsert: true, new: true }
          );
        } catch (balErr) {
          console.log("Warning: failed to update balance:", balErr.message);
        }

        await notify(refund.buyerUid, "Refund completed", `تم استرجاع ${refund.amount} π بنجاح`, {
          orderId: refund.orderId,
          amount: refund.amount,
          status: "completed",
          txid,
        });

        await writeLog("Refund Completed", "info", refundId, refund.orderId, "admin", { paymentId, txid });

        console.log("HTTP Status: 200 - Refund completed:", refundId, txid);
        return NextResponse.json(
          { success: true, message: "تم تنفيذ الاسترجاع بنجاح", data: refund },
          { status: 200 }
        );
      } catch (error) {
        lastError = error;
        attempt += 1;
        refund.retryCount = attempt;
        await refund.save();
        await writeLog("Pi API Error", "error", refundId, refund.orderId, "admin", {
          attempt,
          error: error.message,
        });
        console.log(`HTTP Status: 500 - Refund execution attempt ${attempt} failed:`, error.message);
      }
    }

    // فشلت كل المحاولات
    refund.status = "failed";
    await refund.save();

    await notify(refund.buyerUid, "Refund failed", `تعذّر تنفيذ استرجاع ${refund.productName} حالياً`, {
      orderId: refund.orderId,
      status: "failed",
    });
    await writeLog("Refund Failed", "error", refundId, refund.orderId, "admin", {
      error: lastError?.message,
    });

    console.log("HTTP Status: 500 - Refund failed after retries:", refundId, lastError?.message);
    return NextResponse.json(
      {
        success: false,
        message: "فشل تنفيذ الاسترجاع بعد عدة محاولات. يمكنك إعادة المحاولة لاحقاً.",
        error: lastError?.message,
      },
      { status: 500 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error processing refund action:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء معالجة طلب الاسترجاع", error: error.message },
      { status: 500 }
    );
  }
}
