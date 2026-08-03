export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="aspect-[4/3] w-full animate-pulse bg-secondary" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-secondary" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-secondary" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
        </div>
        <div className="h-6 w-16 animate-pulse rounded-full bg-secondary" />
      </div>
      <div className="mt-3 h-4 w-24 animate-pulse rounded bg-secondary" />
    </div>
  );
}
