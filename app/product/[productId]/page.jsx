"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Star, Store, PackageCheck, PackageX, MessageCircle, ShieldCheck } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { CoinBadge, formatPi } from "@/components/coin-badge";
import { cn } from "@/lib/utils";
import { usePiPurchase } from "@/lib/usePiPurchase";

export default function ProductDetailPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const { loadingProductId, message, handleBuy, authenticateWithPi } = usePiPurchase();

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [myUid, setMyUid] = useState(null);
  const [myUsername, setMyUsername] = useState("");
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setProduct(data.data);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.log("Error fetching product:", error.message);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (productId) fetchProduct();
  }, [productId]);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/products/${productId}/reviews`);
        const data = await res.json();
        if (res.ok && data.success) setReviews(data.data);
      } catch (error) {
        console.log("Error fetching reviews:", error.message);
      } finally {
        setLoadingReviews(false);
      }
    }
    if (productId) fetchReviews();
  }, [productId]);

  async function handleStartReview() {
    try {
      if (typeof window === "undefined" || !window.Pi) {
        setReviewMessage("افتح الصفحة عبر Pi Browser لإضافة تقييم.");
        return;
      }
      const auth = await authenticateWithPi();
      setMyUid(auth.user.uid);
      setMyUsername(auth.user.username || "");
    } catch (error) {
      setReviewMessage("فشل تسجيل الدخول: " + error.message);
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewMessage("");
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerUid: myUid,
          buyerUsername: myUsername,
          rating: myRating,
          comment: myComment,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReviews((prev) => [data.data, ...prev]);
        setMyRating(0);
        setMyComment("");
        setReviewMessage("تم إضافة تقييمك بنجاح ✅");
      } else {
        setReviewMessage(data.message || "فشل إضافة التقييم");
      }
    } catch (error) {
      setReviewMessage("حدث خطأ: " + error.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <BackLink />
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <BackLink />
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
          <p className="font-heading text-lg font-bold">المنتج غير موجود</p>
          <p className="text-sm text-muted-foreground">
            ربما تم حذف هذا المنتج أو أن الرابط غير صحيح.
          </p>
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const inStock = typeof product.stock === "number" ? product.stock > 0 : true;
  const isBuying = loadingProductId === product._id;

  return (
    <div className="flex flex-col pb-28">
      <div className="p-4">
        <BackLink />
      </div>

      <div className="relative mx-4 aspect-square overflow-hidden rounded-2xl border border-border bg-secondary">
        {images.length > 0 ? (
          <Image
            src={images[activeImage] || images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-heading text-6xl text-primary/30">
            π
          </div>
        )}
        <div className="absolute -top-3 start-3">
          <CoinBadge price={product.price} size="lg" />
        </div>
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-3 overflow-x-auto px-4">
          <div className="flex gap-2">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`عرض الصورة ${i + 1}`}
                aria-pressed={activeImage === i}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-secondary transition-colors",
                  activeImage === i ? "border-accent" : "border-transparent"
                )}
              >
                <Image src={img} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 py-5">
        {product.category && (
          <div className="flex items-center gap-2">
            <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {product.category}
            </span>
          </div>
        )}

        <h1 className="font-heading text-2xl font-extrabold leading-tight text-balance text-foreground">
          {product.name}
        </h1>

        <div className="flex flex-wrap gap-2">
          {product.seller?.username && (
            <InfoChip icon={<Store className="h-4 w-4" />} label={product.seller.username} />
          )}
          {product.ratings?.count > 0 && (
            <InfoChip
              icon={<Star className="h-4 w-4 fill-gold text-gold" />}
              label={`${product.ratings.average.toFixed(1)} تقييم`}
            />
          )}
          {inStock ? (
            <InfoChip
              icon={<PackageCheck className="h-4 w-4 text-emerald-600" />}
              label="متوفر"
              tone="success"
            />
          ) : (
            <InfoChip
              icon={<PackageX className="h-4 w-4 text-destructive" />}
              label="نفد المخزون"
              tone="danger"
            />
          )}
        </div>

        {product.description && (
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {product.description}
          </p>
        )}

        {message && (
          <p
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium",
              message.includes("✅") || message.includes("نجاح")
                ? "bg-emerald-50 text-emerald-700"
                : message.includes("خطأ") || message.includes("فشل")
                ? "bg-red-50 text-destructive"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {message}
          </p>
        )}

        {/* ===== قسم التقييمات والمراجعات ===== */}
        <div className="mt-2 border-t border-border pt-4">
          <h2 className="font-heading text-lg font-bold text-foreground">
            التقييمات
            {reviews.length > 0 && (
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                ({reviews.length})
              </span>
            )}
          </h2>

          {loadingReviews && <p className="mt-2 text-sm text-muted-foreground">جاري التحميل...</p>}

          {!loadingReviews && reviews.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">لا توجد تقييمات بعد، كن أول من يقيّم!</p>
          )}

          <div className="mt-3 flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.reviewId} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-card-foreground">
                    {r.buyerUsername || "مستخدم"}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < r.rating ? "fill-gold text-gold" : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                </div>
                {r.verifiedPurchase && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    مشتري موثوق
                  </span>
                )}
                {r.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* نموذج إضافة تقييم */}
          <div className="mt-4 rounded-xl border border-dashed border-border p-3">
            {!myUid ? (
              <button
                type="button"
                onClick={handleStartReview}
                className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                سجّل الدخول لإضافة تقييمك
              </button>
            ) : (
              <form onSubmit={handleSubmitReview} className="flex flex-col gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMyRating(i + 1)}
                      aria-label={`${i + 1} نجوم`}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6",
                          i < myRating ? "fill-gold text-gold" : "text-muted-foreground/30"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  rows={2}
                  placeholder="اكتب رأيك بالمنتج (اختياري)..."
                  className="input-base resize-none"
                />
                <button
                  type="submit"
                  disabled={myRating === 0 || submittingReview}
                  className="rounded-lg bg-brand-gradient py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {submittingReview ? "جاري الإرسال..." : "إرسال التقييم"}
                </button>
              </form>
            )}
            {reviewMessage && (
              <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
                {reviewMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-full max-w-md gap-2 px-4">
        {product.saleType === "contact" && (
          <a
            href={
              product.contactInfo
                ? `https://wa.me/${product.contactInfo.replace(/[^0-9]/g, "")}`
                : "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-card py-3.5 text-sm font-bold text-primary shadow-xl transition-colors hover:bg-secondary"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            تواصل معي
          </a>
        )}
        <button
          type="button"
          onClick={() => handleBuy(product)}
          disabled={!inStock || isBuying}
          className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-base font-bold text-white shadow-xl transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{isBuying ? "جاري المعالجة..." : "شراء الآن"}</span>
          {!isBuying && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm">
              π {formatPi(product.price)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function InfoChip({ icon, label, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
      ? "bg-red-50 text-destructive"
      : "bg-secondary text-secondary-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", toneClass)}>
      {icon}
      {label}
    </span>
  );
}
