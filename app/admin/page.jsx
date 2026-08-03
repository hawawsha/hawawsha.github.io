"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Inbox, Calendar, User, Check, X, Package, TrendingUp, ShoppingBag, Clock, BarChart3, Trash2 } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { formatPi } from "@/components/coin-badge";

const STATUS_LABELS = {
  pending: "قيد المراجعة",
  approved: "تمت الموافقة",
  processing: "جاري التنفيذ...",
  completed: "مكتمل (تم التحويل)",
  rejected: "مرفوض",
  failed: "فشل التنفيذ",
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "1",
    category: "",
    images: "",
    sellerUsername: "",
    saleType: "instant",
    contactInfo: "",
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [productMessage, setProductMessage] = useState("");
  const [deletingProduct, setDeletingProduct] = useState(false);

  const [refunds, setRefunds] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [actingOn, setActingOn] = useState(null);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  async function loadStats(currentSecret) {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-secret": currentSecret },
      });
      const data = await res.json();
      if (res.ok && data.success) setStats(data.data);
    } catch (error) {
      console.log("Failed to load stats:", error.message);
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (res.ok && data.success) setProducts(data.data);
    } catch (error) {
      console.log("Failed to load products:", error.message);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadRefunds(currentSecret) {
    setLoadingRefunds(true);
    try {
      const res = await fetch("/api/refunds", {
        headers: { "x-admin-secret": currentSecret },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRefunds(data.data.filter((r) => r.status === "pending" || r.status === "failed"));
      }
    } catch (error) {
      console.log("Failed to load refunds:", error.message);
    } finally {
      setLoadingRefunds(false);
    }
  }

  async function handleUnlock(e) {
    e.preventDefault();
    setUnlockError("");
    try {
      const res = await fetch("/api/refunds", {
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUnlocked(true);
        setRefunds(data.data.filter((r) => r.status === "pending" || r.status === "failed"));
        loadProducts();
        loadStats(secret);
      } else {
        setUnlockError(data.message || "كلمة السر غير صحيحة");
      }
    } catch (error) {
      setUnlockError("حدث خطأ: " + error.message);
    }
  }

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startEdit(product) {
    setEditingProductId(product.productId);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? "0"),
      category: product.category || "",
      images: (product.images || []).join("\n"),
      sellerUsername: product.seller?.username || "",
      saleType: product.saleType || "instant",
      contactInfo: product.contactInfo || "",
    });
    setProductMessage("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function cancelEdit() {
    setEditingProductId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      stock: "1",
      category: "",
      images: "",
      sellerUsername: "",
      saleType: "instant",
      contactInfo: "",
    });
  }

  async function handleDeleteProduct() {
    if (!editingProductId) return;
    const confirmed = window.confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟ لا يمكن التراجع عن هذا الإجراء.");
    if (!confirmed) return;

    setDeletingProduct(true);
    try {
      const res = await fetch(`/api/products/${editingProductId}`, {
        method: "DELETE",
        headers: { "x-admin-secret": secret },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProductMessage("تم حذف المنتج بنجاح ✅");
        cancelEdit();
        loadProducts();
      } else {
        setProductMessage(data.message || "فشل حذف المنتج");
      }
    } catch (error) {
      setProductMessage("حدث خطأ: " + error.message);
    } finally {
      setDeletingProduct(false);
      setTimeout(() => setProductMessage(""), 3500);
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setSavingProduct(true);
    setProductMessage("");

    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      stock: parseInt(form.stock, 10) || 0,
      images: form.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      sellerUsername: form.sellerUsername || "Souq Pi",
      saleType: form.saleType,
      contactInfo: form.contactInfo,
    };

    try {
      const res = editingProductId
        ? await fetch(`/api/products/${editingProductId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (res.ok && data.success) {
        setProductMessage(editingProductId ? "تم تحديث المنتج بنجاح ✅" : "تمت إضافة المنتج بنجاح ✅");
        setEditingProductId(null);
        setForm({
          name: "",
          description: "",
          price: "",
          stock: "1",
          category: "",
          images: "",
          sellerUsername: "",
          saleType: "instant",
          contactInfo: "",
        });
        loadProducts();
      } else {
        setProductMessage(data.message || "فشلت العملية");
      }
    } catch (error) {
      setProductMessage("حدث خطأ: " + error.message);
    } finally {
      setSavingProduct(false);
      setTimeout(() => setProductMessage(""), 3500);
    }
  }

  async function handleRefundAction(refundId, action) {
    setActingOn(refundId);
    try {
      const res = await fetch(`/api/refunds/${refundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.data) {
        if (data.data.status === "pending" || data.data.status === "failed") {
          setRefunds((prev) => prev.map((r) => (r.refundId === refundId ? data.data : r)));
        } else {
          setRefunds((prev) => prev.filter((r) => r.refundId !== refundId));
        }
      }
      if (!res.ok) alert(data.message || "فشلت العملية");
    } catch (error) {
      alert("حدث خطأ: " + error.message);
    } finally {
      setActingOn(null);
    }
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col">
        <header className="bg-brand-gradient px-4 pb-5 pt-6 text-white shadow-lg">
          <BackLink />
          <h1 className="mt-3 font-heading text-2xl font-extrabold">لوحة الإدارة</h1>
        </header>
        <main className="px-4 py-5">
          <form onSubmit={handleUnlock} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <label htmlFor="secret" className="text-sm font-medium text-foreground">
              كلمة سر الإدارة
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="input-base"
              required
            />
            <button type="submit" className="rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95">
              دخول
            </button>
            {unlockError && <p className="text-center text-sm font-medium text-destructive">{unlockError}</p>}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="bg-brand-gradient px-4 pb-5 pt-6 text-white shadow-lg">
        <BackLink />
        <h1 className="mt-3 font-heading text-2xl font-extrabold">لوحة الإدارة</h1>
        <p className="mt-1 text-sm text-white/80">أدر منتجاتك وطلبات الاسترجاع</p>
        <Link href="/admin/cleanup" className="mt-2 inline-block text-xs text-white/70 underline">
          تنظيف بيانات التجربة (قبل الإطلاق)
        </Link>
        <Link href="/admin/orders" className="mt-1 block text-xs text-white/90 underline">
          تتبع الطلبات (شحن وتسليم) ←
        </Link>
      </header>

      <main className="flex flex-col gap-6 px-4 py-5">
        {/* Section: stats dashboard */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold text-foreground">نظرة سريعة</h2>
          </div>

          {loadingStats && <p className="text-sm text-muted-foreground">جاري حساب الإحصائيات...</p>}

          {!loadingStats && stats && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
                  label="إجمالي المبيعات"
                  value={`π ${formatPi(stats.totalSales)}`}
                />
                <StatCard
                  icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
                  label="طلبات آخر 7 أيام"
                  value={stats.newOrdersCount}
                />
                <StatCard
                  icon={<Check className="h-5 w-5" aria-hidden="true" />}
                  label="طلبات مكتملة"
                  value={stats.totalCompletedOrders}
                />
                <StatCard
                  icon={<Clock className="h-5 w-5" aria-hidden="true" />}
                  label="طلبات قيد الانتظار"
                  value={stats.pendingOrdersCount}
                />
              </div>

              {stats.topProducts.length > 0 && (
                <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-bold text-card-foreground">أكثر المنتجات طلباً</h3>
                  <div className="flex flex-col gap-2.5">
                    {stats.topProducts.map((p, i) => {
                      const max = stats.topProducts[0].count || 1;
                      const widthPct = Math.max(8, Math.round((p.count / max) * 100));
                      return (
                        <div key={i} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate text-foreground">{p.name}</span>
                            <span className="shrink-0 font-medium text-muted-foreground">{p.count}</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-brand-gradient"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Section: add product */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold text-card-foreground">
              {editingProductId ? "تعديل المنتج" : "إضافة منتج جديد"}
            </h2>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleAddProduct}>
            <Field label="اسم المنتج" htmlFor="name">
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleFormChange}
                placeholder="مثال: سماعات لاسلكية"
                className="input-base"
              />
            </Field>

            <Field label="الوصف" htmlFor="description">
              <textarea
                id="description"
                name="description"
                rows={3}
                value={form.description}
                onChange={handleFormChange}
                placeholder="اكتب وصفاً تفصيلياً للمنتج..."
                className="input-base resize-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="السعر (Pi)" htmlFor="price">
                <input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={form.price}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  className="input-base"
                />
              </Field>

              <Field label="المخزون" htmlFor="stock">
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={handleFormChange}
                  placeholder="0"
                  className="input-base"
                />
              </Field>
            </div>

            <Field label="التصنيف" htmlFor="category">
              <select
                id="category"
                name="category"
                required
                value={form.category}
                onChange={handleFormChange}
                className="input-base"
              >
                <option value="" disabled>
                  اختر التصنيف
                </option>
                <option value="سيارات">سيارات</option>
                <option value="عقارات">عقارات</option>
                <option value="إلكترونيات">إلكترونيات</option>
                <option value="كهربائيات">كهربائيات</option>
              </select>
            </Field>

            <Field label="نوع البيع" htmlFor="saleType">
              <select
                id="saleType"
                name="saleType"
                value={form.saleType}
                onChange={handleFormChange}
                className="input-base"
              >
                <option value="instant">شراء فوري (إلكترونيات، كهربائيات...)</option>
                <option value="contact">معاينة وتواصل (سيارات، عقارات...)</option>
              </select>
            </Field>

            {form.saleType === "contact" && (
              <Field label="رقم واتساب للتواصل" htmlFor="contactInfo">
                <input
                  id="contactInfo"
                  name="contactInfo"
                  type="text"
                  value={form.contactInfo}
                  onChange={handleFormChange}
                  placeholder="مثال: 962790000000"
                  className="input-base"
                />
              </Field>
            )}

            <Field label="روابط الصور" htmlFor="images">
              <textarea
                id="images"
                name="images"
                rows={2}
                value={form.images}
                onChange={handleFormChange}
                placeholder="ضع رابط كل صورة في سطر منفصل"
                className="input-base resize-none"
              />
            </Field>

            <Field label="اسم البائع" htmlFor="sellerUsername">
              <input
                id="sellerUsername"
                name="sellerUsername"
                type="text"
                value={form.sellerUsername}
                onChange={handleFormChange}
                placeholder="Souq Pi"
                className="input-base"
              />
            </Field>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingProduct}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                {savingProduct
                  ? "جاري الحفظ..."
                  : editingProductId
                  ? "حفظ التعديلات"
                  : "إضافة المنتج"}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  إلغاء
                </button>
              )}
            </div>

            {editingProductId && (
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deletingProduct}
                className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {deletingProduct ? "جاري الحذف..." : "حذف هذا المنتج نهائياً"}
              </button>
            )}

            {productMessage && (
              <p
                className={
                  "rounded-lg px-3 py-2 text-center text-sm font-medium " +
                  (productMessage.includes("✅")
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-destructive")
                }
              >
                {productMessage}
              </p>
            )}
          </form>
        </section>

        {/* Section B: pick a product to edit */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold text-foreground">تعديل منتج موجود</h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {products.length}
            </span>
          </div>

          {loadingProducts && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}

          {!loadingProducts && products.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد منتجات بعد.</p>
          )}

          {!loadingProducts && products.length > 0 && (
            <select
              value={editingProductId || ""}
              onChange={(e) => {
                const selected = products.find((p) => p.productId === e.target.value);
                if (selected) startEdit(selected);
                else cancelEdit();
              }}
              className="input-base"
            >
              <option value="">اختر منتجاً لتعديله...</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.name} — {p.category} · π {formatPi(p.price)}
                </option>
              ))}
            </select>
          )}
        </section>

        {/* Section C: refund requests */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold text-foreground">طلبات الاسترجاع</h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {refunds.length}
            </span>
          </div>

          {loadingRefunds && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}

          {!loadingRefunds && refunds.length > 0 ? (
            <div className="flex flex-col gap-4">
              {refunds.map((request) => (
                <RefundCard
                  key={request.refundId}
                  request={request}
                  busy={actingOn === request.refundId}
                  onReject={() => handleRefundAction(request.refundId, "reject")}
                  onApprove={() => handleRefundAction(request.refundId, request.status === "failed" ? "retry" : "approve")}
                />
              ))}
            </div>
          ) : (
            !loadingRefunds && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                  <Inbox className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="font-heading text-base font-bold">لا توجد طلبات استرجاع</p>
                <p className="text-sm text-muted-foreground text-pretty">تمت معالجة كل الطلبات. عمل رائع!</p>
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <p className="mt-2 font-heading text-xl font-extrabold text-card-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function RefundCard({ request, onReject, onApprove, busy }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-card-foreground">
            <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {request.buyerUsername || request.buyerUid}
          </span>
          <span className="text-sm text-muted-foreground">{request.productName}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-gold-foreground">
          π {formatPi(request.amount)}
        </span>
      </div>

      {request.reason && (
        <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm leading-relaxed text-foreground text-pretty">
          {request.reason}
        </p>
      )}

      {request.status === "failed" && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          ⚠️ فشلت آخر محاولة تنفيذ (محاولات: {request.retryCount}). اضغط "إعادة المحاولة" لتجربتها من جديد.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {new Date(request.createdAt).toLocaleDateString("ar-EG")}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {STATUS_LABELS[request.status] || request.status}
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        {request.status !== "failed" && (
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            رفض
          </button>
        )}
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="inline-flex flex-[1.4] items-center justify-center gap-1.5 rounded-lg bg-brand-gradient py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {busy ? "جاري التنفيذ..." : request.status === "failed" ? "إعادة المحاولة" : "موافقة وتنفيذ الاسترجاع"}
        </button>
      </div>
    </article>
  );
}
