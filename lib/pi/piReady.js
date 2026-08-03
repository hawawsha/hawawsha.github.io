// lib/pi/piReady.js
"use client";

// يُنشأ هذا الوعد فوراً عند تحميل الوحدة (قبل حتى ما يبدأ سكربت Pi SDK بالتحميل)
// حتى نضمن عدم وجود سباق (race condition) بين تحميل السكربت واستدعاء waitForPiReady
if (typeof window !== "undefined" && !window.__piReadyPromise) {
  window.__piReadyPromise = new Promise((resolve) => {
    window.__resolvePiReady = resolve;
  });
}

/**
 * ينتظر حتى يكتمل window.Pi.init() فعلياً بنجاح.
 * يجب استدعاؤها والانتظار عليها (await) قبل أي استدعاء لـ Pi.authenticate أو Pi.createPayment.
 */
export function waitForPiReady(timeoutMs = 15000) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pi SDK غير متاح خارج المتصفح"));
  }

  const readyPromise =
    window.__piReadyPromise || Promise.reject(new Error("Pi SDK لم يبدأ التحميل بعد"));

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("انتهت المهلة أثناء انتظار تهيئة Pi SDK (Pi.init)")), timeoutMs)
  );

  return Promise.race([readyPromise, timeoutPromise]);
}
