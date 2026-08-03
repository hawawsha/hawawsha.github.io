import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function BackLink({ label = "العودة إلى المتجر", href = "/store" }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
