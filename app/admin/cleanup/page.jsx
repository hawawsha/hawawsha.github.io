"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, AlertTriangle } from "lucide-react";
import { BackLink } from "@/components/back-link";

const OPTIONS = [
  { key: "products", label: "المنتجات" },
  { key: "orders", label: "الطلبات" },
  { key: "reviews", label: "التقييمات" },
  { key: "refunds", label: "طلبات الاسترجاع" },
  { key: "notifications", label: "الإشعارات" },
  { key: "logs", label: "السجلات (Logs)" },
  { key: "balances", label: "أرصدة البائعين" },
];

export default function CleanupPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [selected, setSelected] = useState([]);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function handleUnlock(e) {
    e.preventDefault();
    if (secret.trim()) setUnlocked(true);
  }

  function toggle(key) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleCleanup(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ collections: selected, confirm: confirmText }),
      });
      const data = await res.json();
      setResult({ success: res.ok && data.success, message: data.message, data: data.data });
      if (res.ok && data.success) {
        setSelected([]);
        setConfirmText("");
      }
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <header className="bg-brand-gradient px-4 pb-5 pt-6 text-white shadow-lg">
        <BackLink href="/admin" label="لوحة الإدارة" />
        <h1 className="mt-3 font-heading text-2xl font-extrabold">تنظيف بيانات التجربة</h1>
        <p className="mt-1 text-sm text-white/80">استخدمها قبل الإطلاق الفعلي فقط</p>
      </header>

      <main className="flex flex-col gap-4 px-4 py-5">
        {!unlocked ? (
          <form onSubmit={handleUnlock} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <label className="text-sm font-medium text-foreground">كلمة سر الإدارة</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="input-base"
              required
            />
            <button type="submit" className="rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-md hover:opacity-95">
              دخول
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>هذا الإجراء لا يمكن التراجع عنه. سيتم حذف كل البيانات بالمجموعات المحددة نهائياً.</span>
            </div>

            <form onSubmit={handleCleanup} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-2">
                {OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.key)}
                      onChange={() => toggle(opt.key)}
                      className="h-4 w-4"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  اكتب <span className="font-mono font-bold">DELETE</span> للتأكيد
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="input-base"
                  placeholder="DELETE"
                />
              </div>

              <button
                type="submit"
                disabled={loading || selected.length === 0 || confirmText !== "DELETE"}
                className="flex items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {loading ? "جاري الحذف..." : "حذف البيانات المحددة"}
              </button>
            </form>

            {result && (
              <div
                className={
                  "rounded-xl p-3 text-sm " +
                  (result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-destructive")
                }
              >
                <p className="font-medium">{result.message}</p>
                {result.data && (
                  <ul className="mt-2 flex flex-col gap-0.5 text-xs">
                    {Object.entries(result.data).map(([key, count]) => (
                      <li key={key}>
                        {OPTIONS.find((o) => o.key === key)?.label || key}: حُذف {count}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
