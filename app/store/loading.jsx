import { ProductGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col">
      <div className="bg-brand-gradient px-4 pb-4 pt-5">
        <div className="h-8 w-24 animate-pulse rounded bg-white/25" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-white/20" />
        <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-white/80" />
      </div>
      <div className="no-scrollbar overflow-x-auto px-4 py-3">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-secondary" />
          ))}
        </div>
      </div>
      <div className="px-4 pb-6">
        <ProductGridSkeleton count={3} />
      </div>
    </div>
  );
}
