"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { AuthSplitVisual } from "@/app/components/auth/auth-split-visual";
import { inputPassword } from "@/app/components/auth/auth-input-classes";
import { IconEye, IconEyeSlash, IconLock } from "@/app/components/auth/auth-icons";
import { PasswordRequirements } from "@/app/components/auth/password-requirements";
import { isPasswordValid } from "@/lib/password-requirements";

const SPLIT_IMAGE_LIGHT = "/landing/security-light.png";
const SPLIT_IMAGE_DARK = "/landing/security-dark.png";

export function ResetPasswordView() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const passwordValid = useMemo(() => isPasswordValid(password), [password]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!token || !password || isSubmitting) return;

        if (!passwordValid) {
            setApiError("Password does not meet all requirements.");
            return;
        }

        setIsSubmitting(true);
        setApiError(null);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setApiError(data.error || "Failed to reset password. The link may have expired.");
                return;
            }

            setSuccess(true);
            // Give them a moment to see the success state, then redirect to login
            setTimeout(() => {
                router.push("/login?reset=success");
            }, 3000);
        } catch {
            setApiError("Network error. Please try again.");
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
                    alt="Secure password reset"
                    subtitle="Bank-grade security for your business data."
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
                            {success ? "Success" : "Account Recovery"}
                        </p>
                        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                            {success ? "Password reset" : "Create new password"}
                        </h2>
                        <p className="mt-2 text-[15px] text-muted-foreground">
                            {success
                                ? "Your password has been successfully reset. Redirecting you to login..."
                                : !token
                                    ? "Your password reset link is invalid or is missing the verification token."
                                    : "Enter your new password below."}
                        </p>

                        {!success && token && (
                            <form onSubmit={handleSubmit} className="mt-8 space-y-4 sm:mt-9" noValidate>
                                {apiError && (
                                    <div className="rounded-xl bg-red-500/10 p-4 text-[13px] font-medium text-red-600 dark:text-red-400">
                                        {apiError}
                                    </div>
                                )}
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        <IconLock className="size-[1.125rem]" />
                                    </span>
                                    <label htmlFor="reset-password" className="sr-only">
                                        New Password
                                    </label>
                                    <input
                                        id="reset-password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        placeholder="New password (8+ characters)"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={inputPassword}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:hover:bg-[#262626]"
                                        onClick={() => setShowPassword((s) => !s)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? (
                                            <IconEyeSlash className="size-5" />
                                        ) : (
                                            <IconEye className="size-5" />
                                        )}
                                    </button>
                                </div>

                                <PasswordRequirements password={password} showWhenEmpty />

                                <button
                                    type="submit"
                                    disabled={!passwordValid || isSubmitting}
                                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Resetting…
                                        </>
                                    ) : (
                                        "Reset Password"
                                    )}
                                </button>
                            </form>
                        )}

                        {!success && (
                            <p className="mt-8 text-center text-[14px] text-muted-foreground">
                                Need to request a new link?{" "}
                                <Link
                                    href="/forgot-password"
                                    className="font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                                >
                                    Click here
                                </Link>
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
