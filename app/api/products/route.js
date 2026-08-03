// app/api/products/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import crypto from "crypto";

export async function GET() {
  try {
    await dbConnect();

    const products = await Product.find({ status: "active" }).sort({ createdAt: -1 });

    console.log("HTTP Status: 200 - Fetched products:", products.length);
    return NextResponse.json(
      { success: true, data: products },
      { status: 200 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error fetching products:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب المنتجات", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // حماية بسيطة: يجب إرسال كلمة السر الصحيحة بالـ header
    const adminSecret = request.headers.get("x-admin-secret");
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      console.log("HTTP Status: 401 - Invalid or missing admin secret");
      return NextResponse.json(
        { success: false, message: "غير مصرح لك بإضافة منتجات" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      priceCurrency,
      category,
      images,
      stock,
      sellerUid,
      sellerUsername,
      sellerWallet,
      saleType,
      contactInfo,
    } = body;

    if (!name || !price) {
      console.log("HTTP Status: 400 - Missing name or price");
      return NextResponse.json(
        { success: false, message: "name و price مطلوبان" },
        { status: 400 }
      );
    }

    await dbConnect();

    const product = await Product.create({
      productId: crypto.randomUUID(),
      name: name.trim(),
      description: description || "",
      price,
      priceCurrency: priceCurrency || "PI",
      category: (category || "").trim(),
      images: Array.isArray(images) ? images : images ? [images] : [],
      stock: stock ?? 0,
      seller: {
        uid: sellerUid || "souq-pi",
        username: sellerUsername || "Souq Pi",
        walletAddress: sellerWallet || "",
      },
      status: "active",
      saleType: saleType === "contact" ? "contact" : "instant",
      contactInfo: contactInfo || "",
    });

    console.log("HTTP Status: 201 - Product created:", product.productId);
    return NextResponse.json(
      { success: true, message: "تم إنشاء المنتج بنجاح", data: product },
      { status: 201 }
    );
  } catch (error) {
    console.log("HTTP Status: 500 - Error creating product:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إنشاء المنتج", error: error.message },
      { status: 500 }
    );
  }
}
