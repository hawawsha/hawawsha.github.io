"use client";

import { useEffect, useState } from "react";
import { Bell, Package, RotateCcw, CheckCheck } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { usePiPurchase } from "@/lib/usePiPurchase";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  order: Package,
  refund: RotateCcw,
  payment: Bell,
};

export default function NotificationsPage() {
  const { authenticateWithPi } = usePiPurchase();
  const [uid, setUid] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        if (typeof window === "undefined" || !window.Pi) {
          setError("افتح هذه الصفحة عبر تطبيق Pi Browser لعرض إشعاراتك.");
          setLoading(false);
          return;
        }
        const auth = await authenticateWithPi();
        setUid(auth.user.uid);

        const res = await fetch(`/api/notifications?uid=${encodeURIComponent(auth.user.uid)}`);
        const data = await res.json();
        if (res.ok && data.success) setNotifications(data.data);
      } catch (err) {
        setError("فشل تسجيل الدخول عبر Pi Network.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markAllRead() {
    if (!uid) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.log("Failed to mark all read:", error.message);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col">
      <header className="bg-brand-gradient px-4 pb-5 pt-6 text-white shadow-lg">
        <BackLink />
        <div className="mt-3 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-extrabold">الإشعارات</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              تعليم الكل كمقروء
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-col gap-3 px-4 py-5">
        {loading && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}

        {!loading && error && <p className="text-sm text-muted-foreground">{error}</p>}

        {!loading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
              <Bell className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="font-heading text-base font-bold">لا توجد إشعارات بعد</p>
          </div>
        )}

        {!loading &&
          notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <div
                key={n.notificationId}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 shadow-sm",
                  n.isRead ? "border-border bg-card" : "border-primary/30 bg-secondary/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    n.isRead ? "bg-secondary text-muted-foreground" : "bg-brand-gradient text-white"
                  )}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-card-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground text-pretty">{n.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("ar-EG")}
                  </p>
                </div>
              </div>
            );
          })}
      </main>
    </div>
  );
}
