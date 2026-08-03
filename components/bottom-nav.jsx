"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/store", label: "المتجر", icon: Store },
  { href: "/orders", label: "طلباتي", icon: ClipboardList },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md border-t border-border bg-card/95 backdrop-blur"
    >
      <ul className="flex items-stretch justify-around px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href === "/store" && (pathname === "/" || pathname?.startsWith("/product")));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    active ? "bg-brand-gradient text-white shadow-md" : "bg-transparent"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
