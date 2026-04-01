"use client";

import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { AuthSplitVisual } from "@/app/components/auth/auth-split-visual";
import { ForgotPasswordRequestForm } from "./forgot-password-request-form";
import { ForgotPasswordSentPanel } from "./forgot-password-sent-panel";

const SPLIT_IMAGE_LIGHT = "/landing/order-light.png";
const SPLIT_IMAGE_DARK = "/landing/order-pos.png";
const SECURITY_IMAGE_LIGHT = "/landing/security-light.png";
const SECURITY_IMAGE_DARK = "/landing/security-dark.png";

type Step = "request" | "sent";

function maskEmail(raw: string): string {
  const t = raw.trim();
  const at = t.indexOf("@");
  if (at <= 0) return t || "your email";
  const local = t.slice(0, at);
  const domain = t.slice(at + 1);
  if (!domain) return t;
  const localMasked =
    local.length <= 2
      ? `${local[0] ?? "?"}••`
      : `${local.slice(0, 2)}•••`;
  return `${localMasked}@${domain}`;
}

export function ForgotPasswordView() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  useEffect(() => {
    if (step !== "sent") return;
    setResendSeconds(30);
  }, [step]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = email.trim();
    if (!next || isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: next }),
      });

      if (!res.ok) {
        setApiError("Something went wrong. Please check your email and try again.");
        return;
      }

      setEmail(next);
      setStep("sent");
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendSeconds > 0) return;
    setResendSeconds(30);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      /* ignore */
    }
  }

  function handleUseDifferentEmail() {
    setStep("request");
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div
        className={`flex min-h-screen w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${step === "sent" ? "-translate-x-1/2" : "translate-x-0"
          }`}
      >
        <section className="flex min-h-screen w-1/2 flex-shrink-0 flex-col lg:flex-row">
          <AuthSplitVisual
            lightSrc={SPLIT_IMAGE_LIGHT}
            darkSrc={SPLIT_IMAGE_DARK}
            alt="VentraPOS checkout and orders preview"
            subtitle="We’ll help you get back to selling in no time."
          />
          <ForgotPasswordRequestForm
            email={email}
            setEmail={setEmail}
            isSubmitting={isSubmitting}
            apiError={apiError}
            onSubmit={handleRequestSubmit}
          />
        </section>

        <section className="flex min-h-screen w-1/2 flex-shrink-0 flex-col lg:flex-row">
          <AuthSplitVisual
            lightSrc={SECURITY_IMAGE_LIGHT}
            darkSrc={SECURITY_IMAGE_DARK}
            alt="Secure password reset"
            subtitle="Bank-grade security for your business data."
          />
          <ForgotPasswordSentPanel
            email={email}
            maskedEmail={maskedEmail}
            resendSeconds={resendSeconds}
            onResend={handleResend}
            onUseDifferentEmail={handleUseDifferentEmail}
          />
        </section>
      </div>
    </div>
  );
}
