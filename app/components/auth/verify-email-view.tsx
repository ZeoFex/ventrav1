"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
    writeOnboardingPrefill,
    type OnboardingPrefillPayload,
} from "@/app/lib/onboarding-prefill";

type VerifyState = "loading" | "success" | "error" | "already";

export function VerifyEmailView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [state, setState] = useState<VerifyState>("loading");
    const [message, setMessage] = useState("Verifying your email…");

    useEffect(() => {
        if (!token) {
            setState("error");
            setMessage("This verification link is invalid or incomplete.");
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch("/api/auth/verify-email-link", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });
                const data = await res.json().catch(() => ({}));

                if (cancelled) return;

                if (res.ok) {
                    setState("success");
                    setMessage("Your email is verified. Setting up your store…");
                    const prefill: OnboardingPrefillPayload = {
                        email: data.user?.email,
                        plan: data.user?.plan,
                    };
                    writeOnboardingPrefill(prefill);
                    setTimeout(() => {
                        router.replace(
                            data.user?.onboardingCompleted ? "/dashboard" : "/onboarding",
                        );
                    }, 1200);
                    return;
                }

                if (data.code === "ALREADY_VERIFIED") {
                    setState("already");
                    setMessage("This email is already verified. You can sign in.");
                    return;
                }

                setState("error");
                setMessage(data.error || "This verification link is invalid or has expired.");
            } catch {
                if (!cancelled) {
                    setState("error");
                    setMessage("Network error. Please check your connection and try again.");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md rounded-2xl border border-[#bfc9c3]/30 bg-surface-card p-8 text-center shadow-sm dark:border-white/[0.12] dark:bg-[#111]">
                <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-[#003527]/10 dark:bg-[#6ffbbe]/10">
                    {state === "loading" ? (
                        <svg
                            className="size-7 animate-spin text-[#006c49] dark:text-[#6ffbbe]"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                        </svg>
                    ) : state === "success" ? (
                        <svg
                            className="size-7 text-[#006c49] dark:text-[#6ffbbe]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    ) : (
                        <svg
                            className="size-7 text-amber-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    )}
                </div>

                <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
                    {state === "loading"
                        ? "Verifying email"
                        : state === "success"
                          ? "Email verified"
                          : state === "already"
                            ? "Already verified"
                            : "Verification failed"}
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                    {message}
                </p>

                {(state === "error" || state === "already") && (
                    <div className="mt-8 flex flex-col gap-3">
                        <Link
                            href="/signup"
                            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-6 text-[15px] font-semibold text-white"
                        >
                            Back to sign up
                        </Link>
                        <Link
                            href="/login"
                            className="text-[14px] font-medium text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                        >
                            Sign in instead
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
