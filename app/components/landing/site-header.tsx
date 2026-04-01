"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "../theme-toggle";
import { motion, AnimatePresence } from "motion/react";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compare", label: "Compare" },
] as const;

import { HeaderUserMenu } from "../dashboard/header/header-user-menu";

export function SiteHeader({ isAuthenticated, displayName }: { isAuthenticated?: boolean; displayName?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="pointer-events-auto w-full max-w-[min(100%,42rem)] md:max-w-4xl"
      >
        <nav
          className="relative flex min-h-[3.25rem] items-center gap-1 rounded-full border border-[#bfc9c3]/20 bg-[rgba(255,255,255,0.82)] px-2 py-1.5 shadow-[0_12px_40px_-8px_rgba(0,53,39,0.06),0_0_0_1px_rgba(255,255,255,0.7)_inset] backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.1] dark:bg-[rgba(10,10,10,0.85)] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)_inset] md:gap-2 md:px-3"
          aria-label="Main navigation"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120%_180%_at_50%_-30%,rgba(0,108,73,0.07),transparent_55%)] dark:bg-[radial-gradient(120%_180%_at_50%_-30%,rgba(255,255,255,0.05),transparent_55%)]"
          />

          <Link
            href="/"
            className="relative z-10 shrink-0 rounded-full px-3 py-2 font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-foreground"
          >
            VentraPOS
          </Link>

          <span
            aria-hidden
            className="relative z-10 hidden h-7 w-px shrink-0 bg-[#bfc9c3]/35 dark:bg-white/[0.12] sm:block"
          />

          <div className="relative z-10 hidden min-w-0 flex-1 items-center justify-center gap-0.5 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="relative z-10 ml-auto flex shrink-0 items-center gap-0.5">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
                >
                  Sign in
                </Link>
                <ThemeToggle />
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(0,53,39,0.2)] transition-[filter] hover:brightness-105 dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                >
                  Get started
                </Link>
              </>
            ) : (
              <>
                <ThemeToggle />
                <div className="ml-1.5 flex items-center gap-1.5 md:gap-2">
                  <Link
                    href="/dashboard"
                    className="hidden sm:inline-flex items-center justify-center rounded-full bg-surface-elevated/50 px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-elevated dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    Dashboard
                  </Link>
                  <HeaderUserMenu displayName={displayName} />
                </div>
              </>
            )}

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated sm:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                {menuOpen ? (
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    strokeLinecap="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    strokeLinecap="round"
                    d="M4 7h16M4 12h16M4 17h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-nav"
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="mt-2 overflow-hidden rounded-[1.35rem] border border-[#bfc9c3]/20 bg-[rgba(255,255,255,0.92)] shadow-[0_16px_40px_-12px_rgba(0,53,39,0.08)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-[rgba(12,12,12,0.96)] dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] sm:hidden"
            >
              <div className="flex flex-col gap-0.5 p-2">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-4 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-elevated"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {!isAuthenticated ? (
                  <Link
                    href="/login"
                    className="rounded-xl px-4 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="rounded-xl px-4 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-elevated"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
