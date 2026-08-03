"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Calendar, RotateCcw, PackageCheck, Cog, Truck, Home } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { OrderCardSkeleton } from "@/components/skeletons";
import { formatPi } from "@/components/coin-badge";
import { cn } from "@/lib/utils";
import { usePiPurchase } from "@/lib/usePiPurchase";

const FULFILLMENT_STAGES = [
  { key: "order_received", label: "تم الاستلام", icon: PackageCheck },
  { key: "processing", label: "جاري التجهيز", icon: Cog },
  { key: "shipped", label: "تم الشحن", icon: Truck },
  { key: "delivered", label: "تم التسليم", icon: Home },
];

function OrderTimeline({ currentStage }) {
  const currentIndex = FULFILLMENT_STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="mt-3 flex items-center justify-between">
      {FULFILLMENT_STAGES.map((stage, i) => {
        const Icon = stage.icon;
        const reached = i <= currentIndex;
        const isLast = i === FULFILLMENT_STAGES.length - 1;
        return (
          <div key={stage.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  reached ? "bg-brand-gradient text-white" : "bg-secondary text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    i < currentIndex ? "bg-primary" : "bg-secondary"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "mt-1 text-center text-[10px] leading-tight",
                reached ? "font-bold text-foreground" : "text-muted-foreground"
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_CONFIG = {
  pending: { label: "قيد الانتظار", className: "bg-secondary text-secondary-foreground" },
  approved: { label: "تمت الموافقة", className: "bg-secondary text-secondary-foreground" },
  completed: { label: "مكتمل", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ملغى", className: "bg-red-100 text-destructive" },
  refund_requested: { label: "طلب استرجاع", className: "bg-amber-100 text-amber-700" },
  refunded: { label: "تم الاسترجاع", className: "bg-emerald-100 text-emerald-700" },
};

const REFUND_LABELS = {
  pending: "طلب الاسترجاع قيد المراجعة",
  approved: "تمت الموافقة على الاسترجاع",
  processing: "جاري تنفيذ الاسترجاع...",
  rejected: "تم رفض طلب الاسترجاع",
  completed: "تم استرجاع المبلغ",
  failed: "تعذّر تنفيذ الاسترجاع، سيُعاد المحاولة",
};

export default function OrdersPage() {
  const { authenticateWithPi, logDebug } = usePiPurchase();
  const [orders, setOrders] = useState([]);
  const [refundsByOrder, setRefundsByOrder] = useState({});
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [buyerUid, setBuyerUid] = useState(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        if (typeof window === "undefined" || !window.Pi) {
          setAuthError("افتح هذه الصفحة عبر تطبيق Pi Browser لعرض طلباتك.");
          setLoading(false);
          return;
        }

        const auth = await authenticateWithPi();
        const uid = auth.user.uid;
        setBuyerUid(uid);

        const [ordersRes, refundsRes] = await Promise.all([
          fetch(`/api/orders?buyerUid=${encodeURIComponent(uid)}`),
          fetch(`/api/refunds?buyerUid=${encodeURIComponent(uid)}`),
        ]);

        const ordersData = await ordersRes.json();
        const refundsData = await refundsRes.json();

        if (ordersRes.ok && ordersData.success) setOrders(ordersData.data);
        else setAuthError(ordersData.message || "تعذّر جلب الطلبات");

        if (refundsRes.ok && refundsData.success) {
          const map = {};
          refundsData.data.forEach((r) => (map[r.orderId] = r));
          setRefundsByOrder(map);
        }
      } catch (error) {
        logDebug("Failed to load orders:", error.message);
        setAuthError("فشل تسجيل الدخول عبر Pi Network لعرض طلباتك.");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitRefund(order, reason) {
    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.orderId, buyerUid, reason }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      setRefundsByOrder((prev) => ({ ...prev, [order.orderId]: data.data }));
      return true;
    }
    alert(data.message || "فشل إرسال طلب الاسترجاع");
    return false;
  }

  return (
    <div className="flex flex-col">
      <header className="bg-brand-gradient px-4 pb-5 pt-6 text-white shadow-lg">
        <BackLink />
        <h1 className="mt-3 font-heading text-2xl font-extrabold">طلباتي</h1>
        <p className="mt-1 text-sm text-white/80">تابع حالة مشترياتك وطلبات الاسترجاع</p>
      </header>

      <main className="flex flex-col gap-4 px-4 py-5">
        {loading && (
          <>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </>
        )}

        {!loading && authError && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">{authError}</p>
          </div>
        )}

        {!loading && !authError && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
              <ClipboardList className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="font-heading text-base font-bold">لا توجد طلبات بعد</p>
            <p className="text-sm text-muted-foreground text-pretty">
              ابدأ التسوّق من المتجر وستظهر طلباتك هنا.
            </p>
          </div>
        )}

        {!loading &&
          orders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              refund={refundsByOrder[order.orderId]}
              onSubmitRefund={submitRefund}
            />
          ))}
      </main>
    </div>
  );
}

function OrderCard({ order, refund, onSubmitRefund }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const canRequestRefund = order.status === "completed" && (!refund || refund.status === "rejected");

  async function handleConfirm() {
    setSubmitting(true);
    const ok = await onSubmitRefund(order, reason);
    setSubmitting(false);
    if (ok) {
      setOpen(false);
      setReason("");
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-base font-bold leading-snug text-card-foreground">
          {order.product?.name}
        </h2>
        <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium", status.className)}>
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] font-extrabold text-gold-foreground">
            π
          </span>
          {formatPi(order.payment?.amount)} Pi
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {new Date(order.createdAt).toLocaleDateString("ar-EG")}
        </span>
      </div>

      {order.status === "completed" && (
        <OrderTimeline currentStage={order.fulfillmentStatus || "order_received"} />
      )}

      {order.trackingNumber && (
        <p className="mt-2 text-xs text-muted-foreground">
          رقم التتبع: <span className="font-mono">{order.trackingNumber}</span>
        </p>
      )}

      {refund && (
        <div className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
          {REFUND_LABELS[refund.status] || refund.status}
        </div>
      )}

      {canRequestRefund && (
        <div className="mt-3 border-t border-border pt-3">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              طلب استرجاع
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <label htmlFor={`reason-${order.orderId}`} className="text-sm font-medium">
                سبب طلب الاسترجاع
              </label>
              <textarea
                id={`reason-${order.orderId}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="اكتب سبب رغبتك في استرجاع المنتج..."
                className="input-base resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={reason.trim().length === 0 || submitting}
                  className="flex-1 rounded-lg bg-brand-gradient py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {submitting ? "جاري الإرسال..." : "تأكيد"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setReason("");
                  }}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
