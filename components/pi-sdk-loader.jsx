"use client";

import Script from "next/script";

// يُشتق تلقائياً من متغير بيئة بدل ما يكون ثابت بالكود، لتفادي نسيان تغييره وقت الانتقال لـ Mainnet
const IS_MAINNET = process.env.NEXT_PUBLIC_PI_NETWORK_ENV === "mainnet";

export function PiSdkLoader() {
  return (
    <Script
      src="https://sdk.minepi.com/pi-sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== "undefined" && window.Pi) {
          window.Pi.init({ version: "2.0", sandbox: !IS_MAINNET });
          console.log("Pi SDK initialized successfully. Mainnet:", IS_MAINNET);
          if (window.__resolvePiReady) {
            window.__resolvePiReady(true);
          }
        } else {
          console.log("Pi SDK script loaded but window.Pi is still undefined");
        }
      }}
    />
  );
}
