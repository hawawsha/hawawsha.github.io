"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, PackageOpen, MessageCircle, Bell } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

export default function StorePage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        console.log("HTTP Status (fetch products):", res.status);
        const data = await res.json();

        if (res.ok && data.success) {
          setProducts(data.data);
        }
      } catch (error) {
        console.log("Error fetching products:", error.message);
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchProducts();
  }, []);

  const categories = ["الكل", "سيارات", "عقارات", "إلكترونيات", "كهربائيات"];

  const filtered = useMemo(() => {
    const normalize = (s) =>
      (s || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const normalizedQuery = normalize(query);

    return products.filter((p) => {
      const matchesCategory =
        activeCategory === "الكل" || normalize(p.category) === normalize(activeCategory);
      const matchesQuery = !normalizedQuery || normalize(p.name).includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory, products]);

  return (
    <div className="flex flex-col">
      {/* sticky gradient header */}
      <header className="sticky top-0 z-40 bg-brand-gradient px-4 pb-4 pt-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">
              سوق <span className="align-middle">π</span>
            </h1>
            <p className="mt-1 text-sm text-white/80">تسوّق وادفع مباشرة بعملة Pi</p>
          </div>
          <Link
            href="/notifications"
            aria-label="الإشعارات"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 transition-colors hover:bg-white/25"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            aria-label="بحث"
            className="w-full rounded-xl border-0 bg-white py-3 pe-10 ps-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
      </header>

      {!loadingProducts && categories.length > 1 && (
        <div className="no-scrollbar overflow-x-auto px-4 py-3">
          <div className="flex w-max gap-2">
            {categories.map((cat) => {
              const active = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main className="flex flex-col gap-4 px-4 pb-6 pt-3">
        {loadingProducts && <ProductGridSkeleton count={3} />}

        {!loadingProducts && filtered.length > 0 &&
          filtered.map((product) => <ProductCard key={product._id} product={product} />)}

        {!loadingProducts && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
              <PackageOpen className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="font-heading text-base font-bold text-card-foreground">
              لا توجد منتجات مطابقة
            </p>
            <p className="text-sm text-muted-foreground text-pretty">
              جرّب تغيير التصنيف أو تعديل كلمة البحث.
            </p>
          </div>
        )}
      </main>

      {process.env.NEXT_PUBLIC_STORE_WHATSAPP && (
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_STORE_WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="تواصل معنا عبر واتساب"
          className="fixed bottom-24 end-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-105"
        >
          <MessageCircle className="h-7 w-7" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
