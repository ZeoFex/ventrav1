"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { AuthSplitVisual } from "@/app/components/auth/auth-split-visual";
import { LoginForm, type LoginType } from "./login-form";
import { StaffLoginOtpForm } from "./staff-login-otp-form";
import { toast } from "sonner";

const SPLIT_IMAGE_LIGHT = "/landing/order-light.png";
const SPLIT_IMAGE_DARK = "/landing/order-pos.png";

type StaffStep = "credentials" | "otp";

export function LoginView() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<LoginType>("owner");
  const [staffStep, setStaffStep] = useState<StaffStep>("credentials");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [staffDevOtp, setStaffDevOtp] = useState<string | null>(null);
  const [staffSmsSent, setStaffSmsSent] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const otpCode = useMemo(() => otp.join(""), [otp]);
  const otpComplete = otpCode.length === 6;

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSeconds]);

  function handleLoginTypeChange(type: LoginType) {
    setLoginType(type);
    setStaffStep("credentials");
    setApiError(null);
    setOtp(Array(6).fill(""));
  }

  async function handleOwnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "ACCOUNT_NOT_VERIFIED") {
          setApiError("Your account is not verified. Check your email for the OTP.");
          return;
        }
        if (data.code === "USE_STAFF_LOGIN") {
          setApiError(data.error || "Use Staff login with your phone number.");
          return;
        }
        setApiError(data.error || "Login failed. Please check your credentials.");
        return;
      }

      toast.success("Login successful!", {
        description: "You are now logged in",
      });

      const onboardingDone = data?.user?.onboardingCompleted !== false;
      router.push(onboardingDone ? "/dashboard" : "/onboarding");
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStaffCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !password || isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/auth/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || "Login failed. Please check your credentials.");
        return;
      }

      if (data._devOtp) {
        setStaffDevOtp(data._devOtp);
        toast.message("SMS not configured — use the dev code shown on screen", {
          description: `Code: ${data._devOtp}`,
        });
      } else {
        setStaffDevOtp(null);
      }
      setStaffSmsSent(data.smsSent !== false);

      setStaffStep("otp");
      setResendSeconds(30);
      setOtp(Array(6).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStaffVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpComplete || isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/auth/staff/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          code: otpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || "Invalid code. Please try again.");
        setOtp(Array(6).fill(""));
        otpRefs.current[0]?.focus();
        return;
      }

      toast.success("Welcome back!", {
        description: "Signed in as staff",
      });

      router.push("/dashboard");
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStaffResendOtp() {
    if (resendSeconds > 0 || isSubmitting) return;
    setResendSeconds(30);
    setOtp(Array(6).fill(""));
    setApiError(null);
    otpRefs.current[0]?.focus();

    try {
      const res = await fetch("/api/auth/staff/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (data._devOtp) {
        setStaffDevOtp(data._devOtp);
      }
      setStaffSmsSent(data.smsSent !== false);
    } catch {
      // Silently fail
    }
  }

  function handleOtpDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLFormElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  function handleBackToStaffCredentials() {
    setStaffStep("credentials");
    setOtp(Array(6).fill(""));
    setApiError(null);
  }

  const showStaffOtp = loginType === "staff" && staffStep === "otp";

  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen flex-col lg:flex-row">
        <AuthSplitVisual
          lightSrc={SPLIT_IMAGE_LIGHT}
          darkSrc={SPLIT_IMAGE_DARK}
          alt="VentraPOS checkout and orders preview"
          subtitle="Retail POS that keeps up with your day."
        />

        {showStaffOtp ? (
          <StaffLoginOtpForm
            phone={phone}
            smsSent={staffSmsSent}
            devOtp={staffDevOtp}
            otp={otp}
            otpRefs={otpRefs}
            resendSeconds={resendSeconds}
            otpComplete={otpComplete}
            isSubmitting={isSubmitting}
            apiError={apiError}
            onOtpDigit={handleOtpDigit}
            onOtpPaste={handleOtpPaste}
            onVerify={handleStaffVerifyOtp}
            onResend={handleStaffResendOtp}
            onBack={handleBackToStaffCredentials}
          />
        ) : (
          <LoginForm
            loginType={loginType}
            onLoginTypeChange={handleLoginTypeChange}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            rememberDevice={rememberDevice}
            setRememberDevice={setRememberDevice}
            isSubmitting={isSubmitting}
            apiError={apiError}
            onSubmit={loginType === "owner" ? handleOwnerSubmit : handleStaffCredentialsSubmit}
          />
        )}
      </div>
    </div>
  );
}
