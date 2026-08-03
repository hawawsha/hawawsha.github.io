import Link from "next/link";
import Image from "next/image";
import { CoinBadge } from "@/components/coin-badge";

export function ProductCard({ product }) {
  const image = product.images?.[0];
  const inStock = typeof product.stock === "number" ? product.stock > 0 : true;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Link href={`/product/${product.productId}`} className="block">
        <div className="relative aspect-[4/3] w-full bg-secondary">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-4xl text-primary/30">
              π
            </div>
          )}
          <div className="absolute -top-3 start-3">
            <CoinBadge price={product.price} />
          </div>
          {!inStock && (
            <span className="absolute bottom-2 end-2 rounded-full bg-destructive px-2.5 py-1 text-xs font-medium text-white">
              نفد المخزون
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2">
          <Link href={`/product/${product.productId}`}>
            <h3 className="font-heading text-base font-bold leading-snug text-balance text-card-foreground">
              {product.name}
            </h3>
          </Link>
          {product.category && (
            <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {product.category}
            </span>
          )}
        </div>

        <Link
          href={`/product/${product.productId}`}
          className="flex w-full items-center justify-center rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95"
        >
          شراء الآن
        </Link>
      </div>
    </article>
  );
}
