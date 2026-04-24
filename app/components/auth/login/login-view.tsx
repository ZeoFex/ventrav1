"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { AuthSplitVisual } from "@/app/components/auth/auth-split-visual";
import { LoginForm } from "./login-form";
import { toast } from "sonner";

const SPLIT_IMAGE_LIGHT = "/landing/order-light.png";
const SPLIT_IMAGE_DARK = "/landing/order-pos.png";

export function LoginView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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
          // Give them a link to sign up again or just prompt them to verify
          setApiError("Your account is not verified. Check your email for the OTP.");
          return;
        }
        setApiError(data.error || "Login failed. Please check your credentials.");
        return;
      }

      // Success!
      toast.success("Login successful!", {
        description: "You are now logged in",
      });

      // Resume onboarding if the user never finished it; dashboard otherwise.
      const onboardingDone = data?.user?.onboardingCompleted !== false;
      router.push(onboardingDone ? "/dashboard" : "/onboarding");
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <LoginForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          rememberDevice={rememberDevice}
          setRememberDevice={setRememberDevice}
          isSubmitting={isSubmitting}
          apiError={apiError}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
