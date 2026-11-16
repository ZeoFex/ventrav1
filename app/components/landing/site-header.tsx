"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../theme-toggle";
import { motion, AnimatePresence } from "motion/react";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compare", label: "Compare" },
  { href: "/download", label: "Download" },
] as const;

import { HeaderUserMenu } from "../dashboard/header/header-user-menu";
import { BrandLockup } from "../brand-mark";

export function SiteHeader({ isAuthenticated, displayName }: { isAuthenticated?: boolean; displayName?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="pointer-events-auto w-full max-w-[min(100%,42rem)] md:max-w-4xl"
      >
        <nav
          className="relative flex min-h-12 items-center gap-0.5 rounded-full border border-[#bfc9c3]/20 bg-[rgba(255,255,255,0.82)] px-1.5 py-1 shadow-[0_12px_40px_-8px_rgba(0,53,39,0.06),0_0_0_1px_rgba(255,255,255,0.7)_inset] backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.1] dark:bg-[rgba(10,10,10,0.85)] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)_inset] sm:min-h-[3.25rem] sm:gap-1 sm:px-2 sm:py-1.5 md:gap-2 md:px-3"
          aria-label="Main navigation"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120%_180%_at_50%_-30%,rgba(0,108,73,0.07),transparent_55%)] dark:bg-[radial-gradient(120%_180%_at_50%_-30%,rgba(255,255,255,0.05),transparent_55%)]"
          />

          <BrandLockup
            className="relative z-10 min-w-0 shrink rounded-full py-1 pl-0.5 pr-1 sm:pl-1 sm:pr-2.5"
            size={30}
            wordClassName="hidden text-[15px] min-[400px]:inline"
          />

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
                <ThemeToggle compact />
                <Link
                  href="/pricing"
                  className="hidden items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(0,53,39,0.2)] transition-[filter] hover:brightness-105 sm:inline-flex dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                >
                  Get started
                </Link>
              </>
            ) : (
              <>
                <ThemeToggle compact />
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
              className="inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated sm:hidden"
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
      </motion.div>
    </header>

    <AnimatePresence>
      {menuOpen && (
        <motion.div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="fixed inset-0 z-[90] overflow-y-auto bg-[#f6f4ef] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+5.25rem)] sm:hidden dark:bg-[#0a0a0a]"
        >
          <div className="flex min-h-full flex-col">
            <div className="flex flex-col">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b border-[#e4ddd2] py-4 text-[1.35rem] font-semibold tracking-tight text-[#10241c] dark:border-white/10 dark:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-3 pt-8">
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border border-[#d7e0db] bg-white px-4 py-3.5 text-[15px] font-semibold text-[#10241c] dark:border-white/15 dark:bg-white/5 dark:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-3.5 text-[15px] font-semibold text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Get started
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-3.5 text-[15px] font-semibold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
