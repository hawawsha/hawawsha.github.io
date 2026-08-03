"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_LABELS = {
  pending: "قيد المراجعة",
  approved: "تمت الموافقة",
  processing: "جاري التنفيذ...",
  completed: "مكتمل (تم التحويل)",
  rejected: "مرفوض",
  failed: "فشل التنفيذ",
  cancelled: "ملغى",
};

const STATUS_CLASS = {
  pending: "is-neutral",
  approved: "is-neutral",
  processing: "is-neutral",
  completed: "is-success",
  rejected: "is-error",
  failed: "is-error",
  cancelled: "is-error",
};

export default function AdminRefundsPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actingOn, setActingOn] = useState(null);

  async function loadRefunds(currentSecret) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/refunds", {
        headers: { "x-admin-secret": currentSecret },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setRefunds(data.data);
        setUnlocked(true);
      } else {
        setError(data.message || "كلمة السر غير صحيحة");
      }
    } catch (err) {
      setError("حدث خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(refundId, action) {
    setActingOn(refundId);
    try {
      const res = await fetch(`/api/refunds/${refundId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      // نحدّث السطر بغض النظر عن نجاح أو فشل التنفيذ، لأن data.data تحتوي آخر حالة دايماً
      if (data.data) {
        setRefunds((prev) => prev.map((r) => (r.refundId === refundId ? data.data : r)));
      }

      if (!res.ok) {
        alert(data.message || "فشلت العملية");
      }
    } catch (err) {
      alert("حدث خطأ: " + err.message);
    } finally {
      setActingOn(null);
    }
  }

  useEffect(() => {
    if (unlocked) loadRefunds(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!unlocked) {
    return (
      <div className="sq-page">
        <header className="sq-header sq-header-detail">
          <Link href="/admin" className="sq-back-link">
            ← لوحة الإدارة
          </Link>
          <h1 className="sq-wordmark sq-wordmark-sm">طلبات الاسترجاع</h1>
        </header>

        <div className="sq-detail">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadRefunds(secret);
            }}
            className="sq-admin-form"
          >
            <label className="sq-admin-label">كلمة سر الإدارة</label>
            <input
              type="password"
              className="sq-admin-input"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="أدخل كلمة السر"
            />
            <button type="submit" className="sq-buy-btn sq-buy-btn-lg" disabled={loading}>
              {loading ? "جاري التحقق..." : "دخول"}
            </button>
          </form>
          {error && <p className="sq-message is-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="sq-page">
      <header className="sq-header sq-header-detail">
        <Link href="/admin" className="sq-back-link">
          ← لوحة الإدارة
        </Link>
        <h1 className="sq-wordmark sq-wordmark-sm">طلبات الاسترجاع</h1>
      </header>

      {loading && <p className="sq-loading">جاري التحميل...</p>}

      {!loading && refunds.length === 0 && (
        <p className="sq-empty">لا توجد طلبات استرجاع حالياً.</p>
      )}

      {!loading && refunds.length > 0 && (
        <div className="sq-grid">
          {refunds.map((refund) => (
            <div className="sq-order-card" key={refund.refundId}>
              <div className="sq-order-row">
                <h3 className="sq-order-name">{refund.productName}</h3>
                <span className={"sq-message sq-order-status " + (STATUS_CLASS[refund.status] || "is-neutral")}>
                  {STATUS_LABELS[refund.status] || refund.status}
                </span>
              </div>

              <div className="sq-order-row">
                <span className="sq-order-price">
                  <span className="pi-glyph">π</span> {refund.amount}
                </span>
                <span className="sq-order-date">
                  {new Date(refund.createdAt).toLocaleDateString("ar-EG")}
                </span>
              </div>

              <p className="sq-refund-meta">
                المشتري: <strong>{refund.buyerUsername || refund.buyerUid}</strong>
              </p>

              {refund.reason && <p className="sq-refund-meta">السبب: {refund.reason}</p>}

              {refund.status === "failed" && (
                <p className="sq-refund-meta sq-refund-instructions">
                  ⚠️ فشلت آخر محاولة تنفيذ (محاولات: {refund.retryCount}). تأكد من رصيد محفظة التطبيق
                  ومتغير <code>PI_WALLET_PRIVATE_SEED</code> ثم أعد المحاولة.
                </p>
              )}

              {refund.txid && (
                <p className="sq-refund-meta">معرّف المعاملة: {refund.txid.slice(0, 16)}...</p>
              )}

              {refund.status === "pending" && (
                <div className="sq-refund-actions">
                  <button
                    className="sq-refund-btn sq-refund-confirm"
                    onClick={() => handleAction(refund.refundId, "approve")}
                    disabled={actingOn === refund.refundId}
                  >
                    {actingOn === refund.refundId ? "جاري التنفيذ..." : "موافقة وتنفيذ الاسترجاع"}
                  </button>
                  <button
                    className="sq-refund-btn sq-refund-cancel"
                    onClick={() => handleAction(refund.refundId, "reject")}
                    disabled={actingOn === refund.refundId}
                  >
                    رفض
                  </button>
                </div>
              )}

              {refund.status === "failed" && (
                <button
                  className="sq-refund-btn sq-refund-confirm"
                  onClick={() => handleAction(refund.refundId, "retry")}
                  disabled={actingOn === refund.refundId}
                >
                  {actingOn === refund.refundId ? "جاري إعادة المحاولة..." : "إعادة المحاولة"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
