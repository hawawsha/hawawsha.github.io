// app/api/assistant/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-5";

function buildSystemPrompt(products) {
  const catalog = products
    .map(
      (p) =>
        `- ${p.name} | الفئة: ${p.category || "غير محدد"} | السعر: ${p.price} π | ${
          p.saleType === "contact" ? "نوع البيع: معاينة وتواصل" : "نوع البيع: شراء فوري"
        } | المعرّف: ${p.productId}`
    )
    .join("\n");

  return `أنت مساعد ذكي داخل تطبيق "سوق π" (Souq Pi) - سوق إلكتروني يدفع فيه المستخدمون بعملة Pi Network.

مهامك:
1. الإجابة عن أسئلة المستخدمين بخصوص المتجر بشكل ودود ومختصر.
2. مساعدتهم بالبحث عن منتجات من الكتالوج أدناه بناءً على وصفهم.
3. توجيههم خطوة بخطوة لإتمام عملية شراء: يفتحون صفحة المنتج، يضغطون "شراء الآن"، ويوافقون على الدفع من داخل تطبيق Pi Wallet.
4. شرح كيفية استخدام المتجر: التصفح من صفحة "المتجر"، متابعة الطلبات من "طلباتي"، طلب استرجاع لأي طلب مكتمل، والتواصل عبر زر واتساب العائم لأي استفسار عام.

قواعد مهمة:
- أنت لا تقدر تنفّذ عملية شراء بنفسك؛ فقط ترشد المستخدم للضغط على الأزرار الصحيحة بالتطبيق.
- لما ترشّح منتج، اذكر اسمه وسعره بعملة π بوضوح.
- ردودك قصيرة ومباشرة (اثنين لثلاث جمل عادة)، بالعربية الفصحى المبسطة أو العامية إذا خاطبك المستخدم بالعامية.
- إذا سُئلت عن شيء خارج نطاق المتجر تماماً، اعتذر بلطف ووجّه المستخدم لموضوع المتجر.

كتالوج المنتجات الحالي:
${catalog || "لا توجد منتجات متاحة حالياً."}`;
}

export async function POST(request) {
  try {
    if (!ANTHROPIC_API_KEY) {
      console.log("HTTP Status: 500 - ANTHROPIC_API_KEY not configured");
      return NextResponse.json(
        { success: false, message: "المساعد الذكي غير مفعّل حالياً" },
        { status: 500 }
      );
    }

    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, message: "message مطلوب" },
        { status: 400 }
      );
    }

    await dbConnect();
    const products = await Product.find({ status: "active" }).limit(50);

    const messages = [
      ...(Array.isArray(history) ? history : []).slice(-10),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: buildSystemPrompt(products),
        messages,
      }),
    });

    console.log("HTTP Status (Anthropic):", response.status);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`فشل استدعاء المساعد الذكي: ${response.status} - ${JSON.stringify(data)}`);
    }

    const replyText = data.content?.find((c) => c.type === "text")?.text || "عذراً، لم أفهم طلبك.";

    console.log("HTTP Status: 200 - Assistant replied successfully");
    return NextResponse.json({ success: true, reply: replyText }, { status: 200 });
  } catch (error) {
    console.log("HTTP Status: 500 - Error in assistant:", error.message);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء التواصل مع المساعد", error: error.message },
      { status: 500 }
    );
  }
}
