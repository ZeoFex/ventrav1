"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

const actionClass =
  "inline-flex h-9 items-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(0,53,39,0.8)] dark:from-[#6ffbbe] dark:to-[#b6f5d8] dark:text-[#003527] dark:shadow-none";

function Mark({ active, children }: { active: boolean; children: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-[13px] font-semibold ${
        active
          ? "bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
          : "text-[#3d5248] dark:text-zinc-200"
      }`}
    >
      {children}
    </span>
  );
}

export function MarketNav({
  current,
  signedIn,
  onSignOut,
}: {
  current: "shop" | "account";
  signedIn: boolean;
  onSignOut?: () => void;
}) {
  return (
    <header className="mb-4 shrink-0 sm:mb-5">
      <nav
        aria-label={current === "account" ? "Customer" : "Shop"}
        className="relative flex min-h-[3.25rem] items-center gap-1 rounded-full border border-[#d7e0db] bg-white px-1.5 py-1.5 shadow-[0_16px_40px_-20px_rgba(0,53,39,0.45)] sm:px-2 dark:border-white/15 dark:bg-[#1c1c1c] dark:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.85)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120%_180%_at_0%_-40%,rgba(0,108,73,0.12),transparent_55%)] dark:bg-[radial-gradient(120%_180%_at_0%_-40%,rgba(111,251,190,0.08),transparent_55%)]"
        />
        <Link
          href="/"
          className="relative z-10 shrink-0 rounded-full px-2.5 py-2 font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-[#003527] sm:px-3 dark:text-[#6ffbbe]"
        >
          VentraPOS
        </Link>
        <span aria-hidden className="relative z-10 hidden h-6 w-px shrink-0 bg-[#bfc9c3]/50 sm:block dark:bg-white/15" />
        <div className="relative z-10 flex min-w-0 items-center">
          {current === "shop" ? (
            <h1>
              <Mark active>Shop</Mark>
            </h1>
          ) : (
            <Link href="/shop" className="rounded-full hover:bg-[#f4f1ea] dark:hover:bg-white/5">
              <Mark active={false}>Shop</Mark>
            </Link>
          )}
          {signedIn ? (
            current === "account" ? (
              <h1>
                <Mark active>Account</Mark>
              </h1>
            ) : (
              <Link href="/customer" className="rounded-full hover:bg-[#f4f1ea] dark:hover:bg-white/5">
                <Mark active={false}>Account</Mark>
              </Link>
            )
          ) : null}
        </div>
        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          {signedIn && current === "account" && onSignOut ? (
            <button type="button" onClick={onSignOut} className={actionClass} aria-label="Sign out">
              <LogOut className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : null}
          {!signedIn ? (
            <Link href="/login?as=customer" className={actionClass}>
              Sign in
            </Link>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
