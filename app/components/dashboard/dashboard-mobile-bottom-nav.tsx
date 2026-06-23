"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanBarcode, ShoppingCart } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/dashboard/pos/scan",
    label: "Scan",
    icon: ScanBarcode,
    match: (path: string) => path.startsWith("/dashboard/pos/scan"),
  },
  {
    href: "/dashboard/pos/sale",
    label: "Sales",
    icon: ShoppingCart,
    match: (path: string) =>
      path.startsWith("/dashboard/pos/sale") ||
      path.startsWith("/dashboard/pos/held") ||
      path.startsWith("/dashboard/pos/customer-orders"),
  },
] as const;

export function DashboardMobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#bfc9c3]/20 bg-surface-card/95 backdrop-blur-md lg:hidden dark:border-white/[0.08] dark:bg-[#0a0a0a]/95"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Quick POS navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`tap-target flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active
                  ? "text-[#006c49] dark:text-[#6ffbbe]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
