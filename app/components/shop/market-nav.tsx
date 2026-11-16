"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { BrandLockup } from "@/app/components/brand-mark";

const actionClass =
  "inline-flex h-9 shrink-0 items-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-3 text-[12px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(0,53,39,0.8)] sm:px-3.5 sm:text-[13px] dark:from-[#6ffbbe] dark:to-[#b6f5d8] dark:text-[#003527] dark:shadow-none";

function Mark({ active, children }: { active: boolean; children: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1.5 text-[12px] font-semibold sm:px-3 sm:text-[13px] ${
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
        className="relative flex min-h-12 items-center gap-0.5 overflow-hidden rounded-full border border-[#d7e0db] bg-white px-1 py-1 shadow-[0_16px_40px_-20px_rgba(0,53,39,0.45)] sm:min-h-[3.25rem] sm:gap-1 sm:px-2 sm:py-1.5 dark:border-white/15 dark:bg-[#1c1c1c] dark:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.85)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120%_180%_at_0%_-40%,rgba(0,108,73,0.12),transparent_55%)] dark:bg-[radial-gradient(120%_180%_at_0%_-40%,rgba(111,251,190,0.08),transparent_55%)]"
        />
        <BrandLockup
          className="relative z-10 min-w-0 shrink rounded-full py-1 pl-0.5 pr-0.5 sm:pl-1 sm:pr-2"
          size={30}
          wordClassName="hidden text-[15px] text-[#003527] min-[480px]:inline dark:text-[#6ffbbe]"
        />
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
          <ThemeToggle compact />
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
