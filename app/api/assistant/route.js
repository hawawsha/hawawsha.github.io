// pages/api/shop-assistant.js
import { rateLimit } from './_rateLimit';
import { sanitize, secHeaders, sizeGuard } from './_security';

export default async function handler(req, res) {
  secHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!sizeGuard(req, res, 8_000)) return;

  // Rate limit: 20 رسالة في الدقيقة لكل IP
  if (!rateLimit(req, res, {
    limit: 20,
    windowMs: 60_000,
    message: 'يرجى الانتظار قليلاً قبل إرسال رسالة أخرى'
  })) return;

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const message  = sanitize(req.body?.message || '', 500);
  const history  = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!message) {
    return res.status(400).json({ error: 'الرسالة فارغة' });
  }

  // تحقق من سجل المحادثة وتنظيفه
  const cleanHistory = history
    .slice(-10) // آخر 10 رسائل فقط لتجنب overflow
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .map(m => ({
      role:    m.role === 'user' ? 'user' : 'assistant',
      content: sanitize(m.content, 500)
    }));

  const SYSTEM_PROMPT = `أنت مساعد ذكي ومتخصص لمتجر "Souq Pi" — سوق إلكتروني متكامل يعمل بعملة Pi.

🛍️ معلومات المتجر:
- الفئات المتاحة: سيارات 🚗، إلكترونيات 📱، كهربائيات ⚡، عقارات 🏠
- الدفع يتم بعملة Pi فقط
- لمشاهدة الطلبات: اضغط "طلباتي" في القائمة السفلية
- لطلب استرجاع: اذهب لـ "طلباتي" واضغط "طلب استرجاع"
- للتسوق: اختر فئة من الصفحة الرئيسية ثم اضغط "شراء بـ Pi"
- لتسجيل الدخول: اضغط "دخول" واستخدم حساب Pi Network

📌 قواعد المساعد:
- أجب باللغة التي يكتب بها المستخدم (عربي أو إنجليزي)
- كن مختصراً وودياً ومفيداً
- لا تخترع أسعاراً أو منتجات بعينها — وجّه المستخدم للتصفح
- لا تتحدث في مواضيع خارج نطاق المتجر
- إذا لم تعرف الإجابة، اقترح التواصل مع الدعم`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-haiku-5-5',
        max_tokens: 400,
        system:     SYSTEM_PROMPT,
        messages:   [
          ...cleanHistory,
          { role: 'user', content: message }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error('[shop-assistant] Claude error:', response.status);
      return res.status(500).json({ reply: 'عذراً، حدث خطأ مؤقت. حاول مرة أخرى.' });
    }

    const data  = await response.json();
    const reply = data.content?.[0]?.text || 'عذراً، لم أفهم سؤالك. حاول مرة أخرى.';

    return res.status(200).json({ reply });

  } catch (e) {
    console.error('[shop-assistant] error');
    return res.status(500).json({ reply: 'تعذر الاتصال بالمساعد حالياً.' });
  }
}
