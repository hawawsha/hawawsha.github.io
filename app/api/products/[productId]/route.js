// app/api/products/[productId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";

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

    const { productId } = params;
    const body = await request.json();
    const {
      name,
      description,
      price,
      category,
      images,
      stock,
      sellerUsername,
      saleType,
      contactInfo,
    } = body;

    await dbConnect();

    const product = await Product.findOne({ productId });

    if (!product) {
      console.log("HTTP Status: 404 - Product not found:", productId);
      return NextResponse.json(
        { success: false, message: "المنتج غير موجود" },
        { status: 404 }
      );
    }

    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category.trim();
    if (Array.isArray(images)) product.images = images;
    if (stock !== undefined) product.stock = stock;
    if (sellerUsername !== undefined) product.seller.username = sellerUsername;
    if (saleType !== undefined) product.saleType = saleType === "contact" ? "contact" : "instant";
    if (contactInfo !== undefined) product.contactInfo = contactInfo;

    await product.save();

    console.log("HTTP Status: 200 - Product updated:", productId);
    return NextResponse.json(
      { success: true, message: "تم تحديث المنتج بنجاح", data: product },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error updating product:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحديث المنتج", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log("HTTP Status: 401 - Invalid or missing admin secret");
      return NextResponse.json(
        { success: false, message: "غير مصرح لك" },
        { status: 401 }
      );
    }

    const { productId } = params;

    await dbConnect();

    const product = await Product.findOneAndDelete({ productId });

    if (!product) {
      console.log("HTTP Status: 404 - Product not found:", productId);
      return NextResponse.json(
        { success: false, message: "المنتج غير موجود" },
        { status: 404 }
      );
    }

    console.log("HTTP Status: 200 - Product deleted:", productId, product.name);
    return NextResponse.json(
      { success: true, message: "تم حذف المنتج بنجاح" },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error deleting product:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء حذف المنتج", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { productId } = params;

    console.log("Fetching product by productId:", productId);

    await dbConnect();

    const product = await Product.findOne({ productId });

    if (!product) {
      console.log("HTTP Status: 404 - Product not found:", productId);
      return NextResponse.json(
        { success: false, message: "المنتج غير موجود" },
        { status: 404 }
      );
    }

    console.log("HTTP Status: 200 - Product found:", product.name);
    return NextResponse.json({ success: true, data: product }, { status: 200 });
  } catch (error) {
    console.log("HTTP Status: 500 - Error fetching product:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب المنتج", error: error.message },
      { status: 500 }
    );
  }
}
