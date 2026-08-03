"use client";

import { useEffect, useState } from "react";
import { PackageCheck, Cog, Truck, Home, Calendar } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { formatPi } from "@/components/coin-badge";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "order_received", label: "تم الاستلام", icon: PackageCheck },
  { key: "processing", label: "جاري التجهيز", icon: Cog },
  { key: "shipped", label: "تم الشحن", icon: Truck },
  { key: "delivered", label: "تم التسليم", icon: Home },
];

export default function AdminOrdersPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [trackingDrafts, setTrackingDrafts] = useState({});

  async function loadOrders(currentSecret) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        headers: { "x-admin-secret": currentSecret },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.data);
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

  async function updateStage(orderId, fulfillmentStatus) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/fulfillment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          fulfillmentStatus,
          trackingNumber: trackingDrafts[orderId],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders((prev) => prev.map((o) => (o.orderId === orderId ? data.data : o)));
      } else {
        alert(data.message || "فشل التحديث");
      }
    } catch (error) {
      alert("حدث خطأ: " + error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    if (unlocked) loadOrders(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!unlocked) {
    return (
      <div className="flex flex-col">
        <header className="bg-brand-gradient px-4 pb-5 pt-6 text-white shadow-lg">
          <BackLink href="/admin" label="لوحة الإدارة" />
          <h1 className="mt-3 font-heading text-2xl font-extrabold">تتبع الطلبات</h1>
        </header>
        <main className="px-4 py-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadOrders(secret);
            }}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <label className="text-sm font-medium text-foreground">كلمة سر الإدارة</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="input-base"
              required
            />
            <button type="submit" disabled={loading} className="rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-md hover:opacity-95">
              {loading ? "جاري التحقق..." : "دخول"}
            </button>
            {error && <p className="text-center text-sm font-medium text-destructive">{error}</p>}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="bg-brand-gradient px-4 pb-5 pt-6 text-white shadow-lg">
        <BackLink href="/admin" label="لوحة الإدارة" />
        <h1 className="mt-3 font-heading text-2xl font-extrabold">تتبع الطلبات</h1>
        <p className="mt-1 text-sm text-white/80">حدّث مرحلة كل طلب مكتمل</p>
      </header>

      <main className="flex flex-col gap-4 px-4 py-5">
        {loading && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}

        {!loading && orders.length === 0 && (
          <p className="text-sm text-muted-foreground">لا توجد طلبات مكتملة بعد.</p>
        )}

        {!loading &&
          orders.map((order) => {
            const currentIndex = STAGES.findIndex((s) => s.key === (order.fulfillmentStatus || "order_received"));
            const nextStage = STAGES[currentIndex + 1];

            return (
              <div key={order.orderId} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading text-base font-bold text-card-foreground">
                    {order.product?.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-gold-foreground">
                    π {formatPi(order.payment?.amount)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  المشتري: {order.buyer?.username || order.buyer?.uid}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  {STAGES.map((stage, i) => {
                    const Icon = stage.icon;
                    const reached = i <= currentIndex;
                    return (
                      <div key={stage.key} className="flex flex-1 flex-col items-center">
                        <div className="flex w-full items-center">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                              reached ? "bg-brand-gradient text-white" : "bg-secondary text-muted-foreground"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                          {i < STAGES.length - 1 && (
                            <div className={cn("h-0.5 flex-1", i < currentIndex ? "bg-primary" : "bg-secondary")} />
                          )}
                        </div>
                        <span className="mt-1 text-center text-[9px] leading-tight text-muted-foreground">
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="رقم التتبع (اختياري)"
                    value={trackingDrafts[order.orderId] ?? order.trackingNumber ?? ""}
                    onChange={(e) =>
                      setTrackingDrafts((prev) => ({ ...prev, [order.orderId]: e.target.value }))
                    }
                    className="input-base text-sm"
                  />

                  {nextStage ? (
                    <button
                      type="button"
                      onClick={() => updateStage(order.orderId, nextStage.key)}
                      disabled={updatingId === order.orderId}
                      className="rounded-lg bg-brand-gradient py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
                    >
                      {updatingId === order.orderId
                        ? "جاري التحديث..."
                        : `الانتقال إلى: ${nextStage.label}`}
                    </button>
                  ) : (
                    <p className="text-center text-sm font-medium text-emerald-700">
                      ✅ تم تسليم الطلب بالكامل
                    </p>
                  )}
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                </p>
              </div>
            );
          })}
      </main>
    </div>
  );
}
