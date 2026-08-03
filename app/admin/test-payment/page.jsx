"use client";

import { useState } from "react";
import Link from "next/link";

export default function TestPaymentPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [uid, setUid] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState([]);

  const [stuckPaymentId, setStuckPaymentId] = useState("");
  const [fixingStuck, setFixingStuck] = useState(false);
  const [stuckResult, setStuckResult] = useState(null);

  function handleUnlock(e) {
    e.preventDefault();
    if (secret.trim()) setUnlocked(true);
  }

  async function handleFixStuck(e) {
    e.preventDefault();
    setFixingStuck(true);
    setStuckResult(null);
    try {
      const res = await fetch("/api/admin/fix-stuck-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ paymentId: stuckPaymentId }),
      });
      const data = await res.json();
      setStuckResult({ success: res.ok && data.success, message: data.message, data: data.data });
    } catch (error) {
      setStuckResult({ success: false, message: error.message });
    } finally {
      setFixingStuck(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/admin/test-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ uid, amount: parseFloat(amount) }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setLog((prev) => [
          { uid, status: "success", txid: data.data.txid, time: new Date().toLocaleTimeString() },
          ...prev,
        ]);
        setUid("");
      } else {
        setLog((prev) => [
          { uid, status: "failed", error: data.message, time: new Date().toLocaleTimeString() },
          ...prev,
        ]);
      }
    } catch (error) {
      setLog((prev) => [
        { uid, status: "failed", error: error.message, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="sq-page">
      <header className="sq-header sq-header-detail">
        <Link href="/admin" className="sq-back-link">
          ← لوحة الإدارة
        </Link>
        <h1 className="sq-wordmark sq-wordmark-sm">إرسال دفعة اختبارية</h1>
      </header>

      <div className="sq-detail">
        {!unlocked ? (
          <form onSubmit={handleUnlock} className="sq-admin-form">
            <label className="sq-admin-label">كلمة سر الإدارة</label>
            <input
              type="password"
              className="sq-admin-input"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <button type="submit" className="sq-buy-btn sq-buy-btn-lg">
              دخول
            </button>
          </form>
        ) : (
          <form onSubmit={handleSend} className="sq-admin-form">
            <p style={{ fontFamily: "Tajawal, sans-serif", fontSize: "0.85rem", color: "#4a4560" }}>
              الصق هنا معرّف (uid) الشخص اللي حصلت عليه من صفحة <code>/whoami</code>، وابعث له مبلغ صغير
              (مثلاً 0.01 π). كل عملية ناجحة = معاملة A2U حقيقية لمحفظة فريدة.
            </p>

            <label className="sq-admin-label">معرّف المستخدم (uid)</label>
            <input
              className="sq-admin-input"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="مثال: 3413ae06-026a-44c8-b684-365e02d95aa2"
              required
            />

            <label className="sq-admin-label">المبلغ (π)</label>
            <input
              className="sq-admin-input"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <button type="submit" className="sq-buy-btn sq-buy-btn-lg" disabled={sending}>
              {sending ? "جاري الإرسال..." : "إرسال الدفعة"}
            </button>
          </form>
        )}

        {unlocked && (
          <form onSubmit={handleFixStuck} className="sq-admin-form" style={{ marginTop: "1.5rem" }}>
            <p style={{ fontFamily: "Tajawal, sans-serif", fontSize: "0.85rem", color: "#4a4560" }}>
              لحل دفعة A2U عالقة (ظهرت برسالة "ongoing_payment_found")، الصق معرّف الدفعة
              (identifier) من رسالة الخطأ بالأسفل:
            </p>
            <label className="sq-admin-label">معرّف الدفعة العالقة (paymentId)</label>
            <input
              className="sq-admin-input"
              value={stuckPaymentId}
              onChange={(e) => setStuckPaymentId(e.target.value)}
              placeholder="مثال: TFktZF4CkM5LUF0nqYaF9tsoB31E"
              required
            />
            <button type="submit" className="sq-buy-btn sq-buy-btn-lg" disabled={fixingStuck}>
              {fixingStuck ? "جاري الحل..." : "حل الدفعة العالقة"}
            </button>

            {stuckResult && (
              <p className={"sq-message " + (stuckResult.success ? "is-success" : "is-error")}>
                {stuckResult.success ? "✅ " : "❌ "}
                {stuckResult.message}
                {stuckResult.data?.txid && ` — txid: ${stuckResult.data.txid.slice(0, 16)}...`}
              </p>
            )}
          </form>
        )}

        {log.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            {log.map((entry, i) => (
              <div
                key={i}
                className="sq-order-card"
                style={{ marginBottom: "0.75rem" }}
              >
                <p className="sq-refund-meta">
                  <strong>{entry.time}</strong> — uid: {entry.uid.slice(0, 18)}...
                </p>
                {entry.status === "success" ? (
                  <p className="sq-message is-success" style={{ margin: 0 }}>
                    ✅ نجحت — txid: {entry.txid?.slice(0, 16)}...
                  </p>
                ) : (
                  <p className="sq-message is-error" style={{ margin: 0 }}>
                    ❌ فشلت: {entry.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
