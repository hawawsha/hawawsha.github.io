// app/api/products/[productId]/reviews/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import Order from "@/models/Order";
import Product from "@/models/Product";

export async function GET(request, { params }) {
  try {
    const { productId } = params;

    await dbConnect();

    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });

    console.log("HTTP Status: 200 - Fetched reviews:", reviews.length);
    return NextResponse.json({ success: true, data: reviews }, { status: 200 });
  } catch (error) {
    console.log("HTTP Status: 500 - Error fetching reviews:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب التقييمات", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { productId } = params;
    const { buyerUid, buyerUsername, rating, comment } = await request.json();

    if (!buyerUid || !rating) {
      console.log("HTTP Status: 400 - Missing buyerUid or rating");
      return NextResponse.json(
        { success: false, message: "buyerUid و rating مطلوبان" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "التقييم يجب أن يكون بين 1 و 5" },
        { status: 400 }
      );
    }

    await dbConnect();

    // نتحقق هل هذا المستخدم اشترى فعلياً هذا المنتج وأتمّ الدفع (شارة "مشتري موثوق")
    const completedOrder = await Order.findOne({
      "buyer.uid": buyerUid,
      "product.productId": productId,
      status: { $in: ["completed", "refunded"] },
    });

    const existing = await Review.findOne({ productId, buyerUid });
    if (existing) {
      console.log("HTTP Status: 400 - Review already exists for this buyer/product");
      return NextResponse.json(
        { success: false, message: "لقد قيّمت هذا المنتج مسبقاً" },
        { status: 400 }
      );
    }

    const review = await Review.create({
      productId,
      buyerUid,
      buyerUsername: buyerUsername || "",
      rating,
      comment: comment || "",
      verifiedPurchase: Boolean(completedOrder),
    });

    // تحديث متوسط التقييم وعدد المراجعات بالمنتج
    const allReviews = await Review.find({ productId });
    const average =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Product.findOneAndUpdate(
      { productId },
      { $set: { "ratings.average": average, "ratings.count": allReviews.length } }
    );

    console.log("HTTP Status: 201 - Review created:", review.reviewId);
    return NextResponse.json(
      { success: true, message: "تم إضافة تقييمك بنجاح", data: review },
      { status: 201 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error creating review:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إضافة التقييم", error: error.message },
      { status: 500 }
    );
  }
}
