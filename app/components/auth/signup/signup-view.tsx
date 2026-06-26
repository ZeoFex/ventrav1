"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { writeOnboardingPrefill } from "@/app/lib/onboarding-prefill";
import { isValidPlanId } from "@/config/plans";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { AuthSplitVisual } from "@/app/components/auth/auth-split-visual";
import { SignupAccountForm } from "./signup-account-form";
import type { PasswordChecks } from "@/lib/password-requirements";
import { getPasswordChecks, isPasswordValid } from "@/lib/password-requirements";
import { SignupOtpForm } from "./signup-otp-form";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
    REFERRAL_COOKIE_MAX_AGE_SEC,
    REFERRAL_COOKIE_NAME,
} from "@/config/referrals";

const SPLIT_IMAGE_LIGHT = "/landing/order-light.png";
const SPLIT_IMAGE_DARK = "/landing/order-pos.png";
const SECURITY_IMAGE_LIGHT = "/landing/security-light.png";
const SECURITY_IMAGE_DARK = "/landing/security-dark.png";

type Step = "signup" | "otp";

function SignupViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("signup");
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [otpChannel, setOtpChannel] = useState<"email" | "sms">("email");

  const [otp, setOtp] = useState<string[]>(() => Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendSeconds, setResendSeconds] = useState(0);
  
  const isPaid = searchParams.get("paid") === "true";
  const planParam = searchParams.get("plan") || "";
  const selectedPlan = isValidPlanId(planParam) ? planParam : null;

  useEffect(() => {
    if (!selectedPlan) {
      router.replace("/pricing");
    }
  }, [selectedPlan, router]);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  useEffect(() => {
    const ref = searchParams.get("ref")?.trim();
    if (!ref) return;
    document.cookie = `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(ref)};path=/;max-age=${REFERRAL_COOKIE_MAX_AGE_SEC};SameSite=Lax`;
  }, [searchParams]);

  // API states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const passwordChecks = useMemo(
    (): PasswordChecks => getPasswordChecks(password),
    [password]
  );

  const passwordValid = useMemo(
    () => isPasswordValid(passwordChecks),
    [passwordChecks]
  );

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const confirmHasError =
    confirmPassword.length > 0 && password !== confirmPassword;

  const otpCode = otp.join("");
  const otpComplete = otpCode.length === 6 && /^\d{6}$/.test(otpCode);

  useEffect(() => {
    if (step !== "otp") return;
    setResendSeconds(30);
    const id = window.setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== "otp") return;
    const t = window.setTimeout(() => otpRefs.current[0]?.focus(), 400);
    return () => window.clearTimeout(t);
  }, [step]);

  const setOtpDigit = useCallback((index: number, value: string) => {
    const d = value.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = d;
      return next;
    });
    if (d && index < 5) {
      window.requestAnimationFrame(() => otpRefs.current[index + 1]?.focus());
    }
  }, []);

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent<HTMLFormElement>) => {
      e.preventDefault();
      const raw = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!raw) return;
      const next = Array(6)
        .fill("")
        .map((_, i) => raw[i] ?? "");
      setOtp(next);
      const last = Math.min(raw.length, 5);
      otpRefs.current[last]?.focus();
    },
    [],
  );

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid || !passwordsMatch || !acceptTerms || isSubmitting || !selectedPlan) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          plan: selectedPlan,
          referralCode: searchParams.get("ref")?.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || "Something went wrong.");
        return;
      }

      setStep("otp");
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpComplete || isSubmitting || !selectedPlan) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || "Invalid code. Please try again.");
        // Clear OTP inputs on error
        setOtp(Array(6).fill(""));
        otpRefs.current[0]?.focus();
        return;
      }

      // Success — server has set the JWT cookie.
      // Write onboarding prefill and redirect.
      writeOnboardingPrefill({
        businessId: data.user?.businessId,
        userId: data.user?.id,
        email: email.trim(),
        phone: phone.trim() || undefined,
        storeName: businessName.trim(),
        legalName: fullName.trim(),
        plan: selectedPlan,
        cycle: searchParams.get("cycle") || "monthly",
        paid: isPaid,
      });
      router.push("/onboarding");
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendSeconds > 0 || isSubmitting) return;
    setResendSeconds(30);
    setOtp(Array(6).fill(""));
    setApiError(null);
    otpRefs.current[0]?.focus();

    try {
      await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          channel: otpChannel,
          phone: otpChannel === "sms" ? phone.trim() : undefined,
        }),
      });
    } catch {
      // Silently fail — don't reveal anything
    }
  }

  async function handleSwitchChannel(newChannel: "email" | "sms") {
    if (newChannel === "sms" && !phone.trim()) return;
    setOtpChannel(newChannel);
    setResendSeconds(30);
    setOtp(Array(6).fill(""));
    setApiError(null);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);

    try {
      await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          channel: newChannel,
          phone: newChannel === "sms" ? phone.trim() : undefined,
        }),
      });
    } catch {
      // Silently fail
    }
  }

  function handleBackToSignup() {
    setStep("signup");
    setOtp(Array(6).fill(""));
    setOtpChannel("email");
  }

  if (!selectedPlan) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div
        className={`flex min-h-screen w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${step === "otp" ? "-translate-x-1/2" : "translate-x-0"
          }`}
      >
        <section className="flex min-h-screen w-1/2 flex-shrink-0 flex-col lg:flex-row">
          <AuthSplitVisual
            lightSrc={SPLIT_IMAGE_LIGHT}
            darkSrc={SPLIT_IMAGE_DARK}
            alt="VentraPOS checkout and orders preview"
            subtitle="Retail POS that keeps up with your day."
          />
          <SignupAccountForm
            businessName={businessName}
            setBusinessName={setBusinessName}
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            acceptTerms={acceptTerms}
            setAcceptTerms={setAcceptTerms}
            passwordValid={passwordValid}
            passwordsMatch={passwordsMatch}
            confirmHasError={confirmHasError}
            isSubmitting={isSubmitting}
            apiError={apiError}
            onSubmit={handleSignupSubmit}
            isPaid={isPaid}
            selectedPlan={selectedPlan}
          />
        </section>

        <section className="flex min-h-screen w-1/2 flex-shrink-0 flex-col lg:flex-row">
          <AuthSplitVisual
            lightSrc={SECURITY_IMAGE_LIGHT}
            darkSrc={SECURITY_IMAGE_DARK}
            alt="Secure verification — enter your one-time code"
            subtitle="Bank-grade security for your business data."
          />
          <SignupOtpForm
            email={email}
            phone={phone}
            otpChannel={otpChannel}
            otp={otp}
            otpRefs={otpRefs}
            resendSeconds={resendSeconds}
            otpComplete={otpComplete}
            isSubmitting={isSubmitting}
            apiError={apiError}
            onOtpDigit={setOtpDigit}
            onOtpPaste={handleOtpPaste}
            onVerify={handleVerifyOtp}
            onResend={handleResend}
            onSwitchChannel={handleSwitchChannel}
            onBack={handleBackToSignup}
          />
        </section>
      </div>
    </div>
  );
}

export function SignupView() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupViewContent />
    </Suspense>
  );
}
