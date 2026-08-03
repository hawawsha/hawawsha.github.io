import { cn } from "@/lib/utils";

export function formatPi(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/**
 * شارة "عملة π" ذهبية دائرية بحافة متقطعة ومائلة قليلاً، تُستخدم كسعر
 * لأي منتج بمظهر "ملصق عملة حقيقي".
 */
export function CoinBadge({ price, className, size = "sm" }) {
  const dims = size === "lg" ? "h-20 w-20 text-2xl" : "h-16 w-16 text-lg";

  return (
    <div
      className={cn(
        "flex -rotate-6 items-center justify-center rounded-full border-2 border-dashed border-[#b8860b] bg-gold text-gold-foreground shadow-lg ring-2 ring-white/70",
        dims,
        className
      )}
      aria-label={`السعر ${formatPi(price)} باي`}
    >
      <span className="flex flex-col items-center leading-none">
        <span className="font-heading font-extrabold">
          <span className="align-middle">π</span> {formatPi(price)}
        </span>
        <span className={cn("mt-0.5 font-medium opacity-70", size === "lg" ? "text-[11px]" : "text-[9px]")}>
          Pi
        </span>
      </span>
    </div>
  );
}
