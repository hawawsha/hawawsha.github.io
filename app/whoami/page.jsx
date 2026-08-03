"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePiPurchase } from "@/lib/usePiPurchase";

export default function WhoAmIPage() {
  const { authenticateWithPi } = usePiPurchase();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function login() {
      try {
        if (typeof window === "undefined" || !window.Pi) {
          setError("افتح هذه الصفحة عبر تطبيق Pi Browser.");
          setLoading(false);
          return;
        }
        const auth = await authenticateWithPi();
        setUser(auth.user);
      } catch (err) {
        setError("فشل تسجيل الدخول: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    login();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sq-page">
      <header className="sq-header sq-header-detail">
        <Link href="/store" className="sq-back-link">
          ← الرجوع للمتجر
        </Link>
        <h1 className="sq-wordmark sq-wordmark-sm">معرّفك بالتطبيق</h1>
      </header>

      <div className="sq-detail">
        {loading && <p className="sq-loading">جاري تسجيل الدخول...</p>}

        {!loading && error && <p className="sq-message is-error">{error}</p>}

        {!loading && user && (
          <div className="sq-admin-form">
            <p style={{ fontFamily: "Tajawal, sans-serif" }}>
              مرحباً <strong>{user.username || "بك"}</strong>! أرسل هذا المعرّف (uid) للإدارة:
            </p>
            <div
              style={{
                direction: "ltr",
                textAlign: "left",
                background: "#f5f3ff",
                padding: "1rem",
                borderRadius: "12px",
                fontFamily: "monospace",
                fontSize: "0.95rem",
                wordBreak: "break-all",
                userSelect: "all",
              }}
            >
              {user.uid}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
