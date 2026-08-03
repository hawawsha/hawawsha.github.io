// app/api/notifications/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json(
        { success: false, message: "uid مطلوب" },
        { status: 400 }
      );
    }

    await dbConnect();

    const notifications = await Notification.find({ uid }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ uid, isRead: false });

    console.log("HTTP Status: 200 - Fetched notifications:", notifications.length);
    return NextResponse.json(
      { success: true, data: notifications, unreadCount },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error fetching notifications:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب الإشعارات", error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { uid, notificationId, markAllRead } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { success: false, message: "uid مطلوب" },
        { status: 400 }
      );
    }

    await dbConnect();

    if (markAllRead) {
      await Notification.updateMany({ uid, isRead: false }, { $set: { isRead: true } });
      console.log("HTTP Status: 200 - Marked all notifications as read for:", uid);
      return NextResponse.json({ success: true, message: "تم تعليم الكل كمقروء" }, { status: 200 });
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "notificationId مطلوب" },
        { status: 400 }
      );
    }

    await Notification.findOneAndUpdate({ notificationId, uid }, { $set: { isRead: true } });

    console.log("HTTP Status: 200 - Marked notification as read:", notificationId);
    return NextResponse.json({ success: true, message: "تم التحديث" }, { status: 200 });
  } catch (error) {
    console.log("HTTP Status: 500 - Error updating notification:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء التحديث", error: error.message },
      { status: 500 }
    );
  }
}
