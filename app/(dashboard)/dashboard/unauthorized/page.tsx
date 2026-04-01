"use client";

import { ShieldAlert, ArrowLeft, Home, HelpCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-8 flex size-24 items-center justify-center rounded-3xl bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
      >
        <ShieldAlert className="size-12" />
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-4 rounded-full bg-red-500/5 blur-2xl"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        Access Denied
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-4 max-w-[460px] text-lg text-muted-foreground"
      >
        You don&apos;t have the required permissions to access this page. This area is restricted to administrators or store owners.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-full bg-[#003527] px-6 py-3 text-[15px] font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-[#6ffbbe] dark:text-[#003527]"
        >
          <Home className="size-4" />
          Back to Dashboard
        </Link>
        <Link
          href="/dashboard/support"
          className="flex items-center gap-2 rounded-full border border-[#bfc9c3]/30 bg-surface-card px-6 py-3 text-[15px] font-semibold text-foreground transition-all hover:bg-surface-elevated active:scale-95 dark:border-white/10 dark:bg-[#1a1a1a] dark:hover:bg-[#262626]"
        >
          <HelpCircle className="size-4" />
          Contact Support
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="mt-16 text-[13px] text-muted-foreground/60"
      >
        Ref ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}
      </motion.div>
    </div>
  );
}
