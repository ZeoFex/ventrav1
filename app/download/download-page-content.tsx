"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Download,
  ShieldCheck,
  ArrowRight,
  Monitor,
  Laptop,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DownloadMatrix = {
  windows: { x64: string | null; x86: string | null };
  macos: { arm64: string | null; intel: string | null };
  linux: { x64: string | null };
};

type OS = "windows" | "macos" | "linux";

type Props = {
  downloadMatrix: DownloadMatrix;
  /** Current desktop app version (read from package.json). */
  appVersion: string;
};

function osHasDownload(m: DownloadMatrix, os: OS): boolean {
  if (os === "windows") return Boolean(m.windows.x64 || m.windows.x86);
  if (os === "macos") return Boolean(m.macos.arm64 || m.macos.intel);
  return Boolean(m.linux.x64);
}

export function DownloadPageContent({ downloadMatrix, appVersion }: Props) {
  const [os, setOs] = useState<OS>(() => {
    if (osHasDownload(downloadMatrix, "windows")) return "windows";
    if (osHasDownload(downloadMatrix, "macos")) return "macos";
    if (osHasDownload(downloadMatrix, "linux")) return "linux";
    return "windows";
  });

  const variantKeys = useMemo(() => {
    if (os === "windows") return ["x64", "x86"] as const;
    if (os === "macos") return ["arm64", "intel"] as const;
    return ["x64"] as const;
  }, [os]);

  const [variant, setVariant] = useState<string>(() => {
    const m = downloadMatrix;
    if (m.windows.x64) return "x64";
    if (m.windows.x86) return "x86";
    if (m.macos.arm64) return "arm64";
    if (m.macos.intel) return "intel";
    if (m.linux.x64) return "x64";
    return "x64";
  });

  const currentUrl = useMemo(() => {
    if (os === "windows") {
      if (variant === "x64") return downloadMatrix.windows.x64;
      if (variant === "x86") return downloadMatrix.windows.x86;
    }
    if (os === "macos") {
      if (variant === "arm64") return downloadMatrix.macos.arm64;
      if (variant === "intel") return downloadMatrix.macos.intel;
    }
    if (os === "linux" && variant === "x64") return downloadMatrix.linux.x64;
    return null;
  }, [os, variant, downloadMatrix]);

  const headlineOs =
    os === "windows" ? "Windows" : os === "macos" ? "macOS" : "Linux";

  const osOptions: { id: OS; label: string; icon: typeof Monitor }[] = [
    { id: "windows", label: "Windows", icon: Monitor },
    { id: "macos", label: "macOS", icon: Laptop },
    { id: "linux", label: "Linux", icon: Terminal },
  ];

  const archLabels: Record<string, string> = {
    x64: "64-bit (x64)",
    x86: "32-bit (x86)",
    arm64: "Apple Silicon (ARM64)",
    intel: "Intel (x64)",
  };

  const anyConfigured =
    osHasDownload(downloadMatrix, "windows") ||
    osHasDownload(downloadMatrix, "macos") ||
    osHasDownload(downloadMatrix, "linux");

  return (
    <div className="bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border/60 pb-16 pt-12 md:pb-20 md:pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,53,39,0.08),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.04),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8 w-full max-w-md mx-auto"
          >
            <p className="mb-2 text-left text-[13px] font-medium text-muted-foreground sm:text-center">
              Operating system
            </p>
            <div
              className="flex flex-wrap gap-2 rounded-2xl border border-border/80 bg-surface-elevated/40 p-1.5 sm:justify-center"
              role="tablist"
              aria-label="Choose operating system"
            >
              {osOptions.map(({ id, label, icon: Icon }) => {
                const enabled = osHasDownload(downloadMatrix, id);
                const selected = os === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    disabled={!enabled}
                    onClick={() => {
                      if (!enabled) return;
                      setOs(id);
                      if (id === "windows") {
                        if (downloadMatrix.windows.x64) setVariant("x64");
                        else if (downloadMatrix.windows.x86) setVariant("x86");
                        else setVariant("x64");
                      } else if (id === "macos") {
                        if (downloadMatrix.macos.arm64) setVariant("arm64");
                        else if (downloadMatrix.macos.intel) setVariant("intel");
                        else setVariant("arm64");
                      } else {
                        setVariant("x64");
                      }
                    }}
                    className={cn(
                      "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-[13px] font-medium transition-colors sm:flex-none sm:min-w-[7.5rem]",
                      selected &&
                        enabled &&
                        "bg-gradient-to-br from-[#003527] to-[#064e3b] text-white shadow-sm",
                      !selected && enabled && "text-foreground hover:bg-background/80",
                      !enabled &&
                        "cursor-not-allowed opacity-45 pointer-events-none text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="mb-8 w-full max-w-md mx-auto"
          >
            <p className="mb-2 text-left text-[13px] font-medium text-muted-foreground sm:text-center">
              Architecture / variant
            </p>
            <div
              className="flex flex-wrap gap-2 rounded-2xl border border-border/80 bg-surface-elevated/40 p-1.5 sm:justify-center"
              role="tablist"
              aria-label="Choose architecture"
            >
              {variantKeys.map((key) => {
                let available = false;
                if (os === "windows") {
                  available = key === "x64" ? Boolean(downloadMatrix.windows.x64) : Boolean(downloadMatrix.windows.x86);
                } else if (os === "macos") {
                  available =
                    key === "arm64"
                      ? Boolean(downloadMatrix.macos.arm64)
                      : Boolean(downloadMatrix.macos.intel);
                } else {
                  available = Boolean(downloadMatrix.linux.x64);
                }
                const selected = variant === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    disabled={!available}
                    onClick={() => {
                      if (available) setVariant(key);
                    }}
                    className={cn(
                      "inline-flex min-h-10 flex-1 items-center justify-center rounded-xl px-3 text-[13px] font-medium transition-colors sm:flex-none",
                      selected &&
                        available &&
                        "bg-[#003527]/15 text-[#003527] ring-1 ring-[#003527]/30 dark:bg-white/10 dark:text-white dark:ring-white/20",
                      !selected && available && "text-foreground hover:bg-background/80",
                      !available &&
                        "cursor-not-allowed opacity-45 pointer-events-none text-muted-foreground"
                    )}
                  >
                    {archLabels[key] ?? key}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="mb-4 flex justify-center"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full border border-[#003527]/15 bg-[#003527]/5 px-3 py-1 text-[12px] font-medium text-[#003527] dark:border-white/15 dark:bg-white/5 dark:text-white/85"
              aria-label={`Latest version v${appVersion}`}
            >
              <span className="inline-block size-1.5 rounded-full bg-[#006c49]" aria-hidden />
              Latest · v{appVersion}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-tight"
          >
            Download VentraPOS for {headlineOs}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Install the desktop app for a focused POS experience. Use the same VentraPOS account as the
            web app — sign in after install and you are ready to sell.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            {currentUrl ? (
              <a
                href={currentUrl}
                className="inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-8 text-[15px] font-semibold text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] sm:w-auto"
              >
                <Download className="size-4 shrink-0" aria-hidden />
                Download installer
              </a>
            ) : (
              <p className="max-w-md rounded-2xl border border-border/80 bg-surface-elevated/50 px-5 py-4 text-sm text-muted-foreground">
                {anyConfigured ? (
                  <>
                    No download is configured for this platform and variant yet. Choose another option
                    above, or use the web app.
                  </>
                ) : (
                  <>
                    The download link is not configured yet. Set{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                      NEXT_PUBLIC_WINDOWS_DESKTOP_DOWNLOAD_URL
                    </code>{" "}
                    (and optional{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                      NEXT_PUBLIC_MACOS_*_DESKTOP_DOWNLOAD_URL
                    </code>
                    ,{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                      NEXT_PUBLIC_LINUX_DESKTOP_DOWNLOAD_URL
                    </code>
                    ) in your environment.
                  </>
                )}
              </p>
            )}
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-1 rounded-full border border-border bg-background px-8 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-elevated"
            >
              Use web app instead
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </motion.div>

          {currentUrl && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.22 }}
              className="mt-5 text-center text-[12px] text-muted-foreground"
            >
              Version {appVersion} · {headlineOs} {archLabels[variant] ?? variant} installer
            </motion.p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center font-[family-name:var(--font-display)] text-xl font-semibold md:text-2xl">
          Before you install
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-surface-elevated/30 p-6">
            <h3 className="font-semibold text-foreground">System requirements</h3>
            {os === "windows" && (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Windows 10 or Windows 11 ({variant === "x86" ? "32-bit" : "64-bit"})</li>
                <li>Internet connection for cloud sync and updates</li>
                <li>Administrator rights may be required for installation</li>
              </ul>
            )}
            {os === "macos" && (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>macOS 12 or later ({variant === "arm64" ? "Apple Silicon" : "Intel"})</li>
                <li>Internet connection for cloud sync and updates</li>
              </ul>
            )}
            {os === "linux" && (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>64-bit Linux (glibc-based distributions)</li>
                <li>Internet connection for cloud sync and updates</li>
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-border/80 bg-surface-elevated/30 p-6">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="size-5 text-[#006c49]" aria-hidden />
              Security note
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {os === "windows" ? (
                <>
                  If Windows SmartScreen shows a warning, choose &quot;More info&quot; and then &quot;Run
                  anyway&quot; — common for new apps until the installer is code-signed.
                </>
              ) : (
                <>
                  Only download installers from this official page or links we provide. If your browser
                  warns about the file, verify the publisher before opening.
                </>
              )}
            </p>
          </div>
        </div>

        <h2 className="mt-16 text-center font-[family-name:var(--font-display)] text-xl font-semibold md:text-2xl">
          Install in three steps
        </h2>
        <ol className="mx-auto mt-8 max-w-2xl space-y-4">
          {[
            "Download the installer from the button above.",
            "Run the file and follow the setup wizard.",
            "Open VentraPOS and sign in with your VentraPOS account.",
          ].map((step, i) => (
            <li
              key={step}
              className="flex gap-4 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground md:text-base"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#003527]/10 text-sm font-semibold text-[#003527] dark:bg-white/10 dark:text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground">
          Need the browser version?{" "}
          <Link href="/signup" className="font-medium text-[#006c49] underline-offset-4 hover:underline">
            Create an account
          </Link>{" "}
          or{" "}
          <Link href="/login" className="font-medium text-[#006c49] underline-offset-4 hover:underline">
            sign in
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
