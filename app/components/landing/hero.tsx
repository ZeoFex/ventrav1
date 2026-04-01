"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

/** Swap `public/hero-dashboard.png` — update width/height if dimensions change. */
const DASHBOARD_IMAGE = "/landing/ventra.png";

const partners = [
  "A&B Pharmacy",
  "Adom Ventures",
  "K&A Enterprise",
  "Food Hub",
  "Krabz",
  "Logitech",
] as const;

export function LandingHero({ isAuthenticated }: { isAuthenticated?: boolean }) {
  return (
    <section className="relative overflow-hidden bg-background pb-16 pt-28 text-foreground md:pb-24 md:pt-32">
      {/* Light: soft brand tint · Dark: neutral lift only (no green cast) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,53,39,0.08),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.04),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-[min(60vh,520px)] w-[min(140%,900px)] -translate-x-1/2 translate-y-1/3 bg-[radial-gradient(circle,rgba(0,108,73,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_65%)]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8 inline-flex items-center gap-2 rounded-full bg-surface-elevated px-4 py-1.5 text-[13px] font-medium tracking-wide text-muted-foreground"
        >
          <span
            className="size-2 shrink-0 rounded-full bg-[#006c49]"
            aria-hidden
          />
          <span className="font-[family-name:var(--font-display)]">
            New feature — POS insights
          </span>
        </motion.div>

        {/* Headline block — centered per reference; product copy is Ventra */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="max-w-[22ch] text-center font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.12] tracking-tight"
        >
          Manage your sales and analytics in one place
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mt-5 max-w-2xl text-center text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          Enhance efficiency and run your business with{" "}
          <span className="font-semibold text-foreground">VentraPOS</span>, the
          operations dashboard built for retail and growing SMEs. Start now and
          feel the difference.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
        >
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-8 text-[15px] font-medium text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)]"
            >
              Go to dashboard
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-8 text-[15px] font-medium text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)]"
            >
              Get started for free
            </Link>
          )}
          <Link
            href="/features"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-secondary-cta px-8 text-[15px] font-medium text-foreground transition-colors hover:bg-secondary-cta-hover"
          >
            See features
          </Link>
        </motion.div>

        {/* Dashboard — single surface (no nested bg = no seam / “border” in dark mode) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative z-0 mt-14 w-full max-w-5xl md:mt-20"
        >
          <div className="overflow-hidden rounded-[20px] bg-background shadow-[0_20px_48px_-24px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_48px_-24px_rgba(0,0,0,0.55)] [&_img]:m-0 [&_img]:block [&_img]:max-w-full [&_img]:border-0 [&_img]:p-0 [&_img]:outline-none [&_img]:ring-0">
            <Image
              src={DASHBOARD_IMAGE}
              alt="VentraPOS dashboard preview: sales metrics, orders, and inventory"
              width={564}
              height={470}
              priority
              className="block h-auto w-full border-0 object-contain outline-none ring-0"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="relative z-10 mt-12 flex w-full max-w-5xl flex-col items-center px-2 pb-4 md:mt-14 md:pb-8"
        >
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
            Trusted by thriving Businesses and Retailers
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-[0.42] grayscale dark:opacity-50">
            {partners.map((name) => (
              <span
                key={name}
                className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
