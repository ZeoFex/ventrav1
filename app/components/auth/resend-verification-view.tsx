"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { AuthSplitVisual } from "@/app/components/auth/auth-split-visual";
import { IconEnvelope } from "@/app/components/auth/auth-icons";
import { inputBase } from "@/app/components/auth/auth-input-classes";

const SECURITY_IMAGE_LIGHT = "/landing/security-light.png";
const SECURITY_IMAGE_DARK = "/landing/security-dark.png";

export function ResendVerificationView() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setEmail(emailFromQuery);
  }, [emailFromQuery]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || cooldown > 0) return;
    // TODO: POST /api/auth/resend-verification
    setSent(true);
    setCooldown(60);
  }

  const canSubmit = email.trim().length > 0 && cooldown === 0;

  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen flex-col lg:flex-row">
        <AuthSplitVisual
          lightSrc={SECURITY_IMAGE_LIGHT}
          darkSrc={SECURITY_IMAGE_DARK}
          alt="Secure email verification"
          subtitle="We’ll send a fresh code to your inbox."
        />

        <div className="flex flex-1 flex-col justify-center bg-background px-6 pb-12 pt-8 sm:px-10 lg:justify-start lg:px-16 lg:pb-16 lg:pt-14 xl:px-24">
          <div className="mx-auto w-full max-w-[420px]">
            {/* Mobile Brand Header */}
            <div className="mb-10 flex flex-col lg:hidden">
              <Link
                href="/"
                className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-foreground"
              >
                VentraPOS
              </Link>
              <div className="mt-1.5 h-1 w-8 rounded-full bg-gradient-to-r from-[#006c49] to-[#059669]" />
            </div>

            <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Email verification
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Resend verification code
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Enter the email you used to register. We’ll send a new 6-digit code
              you can use on the verification screen.
            </p>

            {sent && (
              <p
                className="mt-6 rounded-xl border border-[#006c49]/25 bg-[#006c49]/[0.06] px-4 py-3 text-[14px] leading-snug text-[#006c49] dark:border-[#6ffbbe]/25 dark:bg-[#6ffbbe]/[0.08] dark:text-[#6ffbbe]"
                role="status"
              >
                If an account exists for that email, we’ve sent a new code.
                Check your inbox and spam folder.
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-4 sm:mt-9"
              noValidate
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <IconEnvelope className="size-[1.125rem]" />
                </span>
                <label htmlFor="resend-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="resend-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputBase}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
              >
                {cooldown > 0
                  ? `Send again in ${cooldown}s`
                  : sent
                    ? "Send another code"
                    : "Send verification code"}
              </button>
            </form>

            <p className="mt-8 text-center text-[14px] text-muted-foreground">
              <Link
                href="/signup"
                className="font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
              >
                Back to sign up
              </Link>
              <span className="mx-2 text-muted-foreground/60">·</span>
              <Link
                href="/login"
                className="font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
