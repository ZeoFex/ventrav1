"use client";

import { useSession } from "@/app/components/auth/use-session";
import { PREMIUM_TRIAL_DAYS, planHasTrialCountdown } from "@/config/plans";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HeaderSubscriptionProgress() {
    const { user } = useSession();
    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    useEffect(() => {
        if (user?.currentPeriodEnd && planHasTrialCountdown(user.plan as "starter" | "growth" | "pro")) {
            const end = new Date(user.currentPeriodEnd).getTime();
            const now = Date.now();
            const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
            setDaysLeft(Math.max(0, diff));
        } else {
            setDaysLeft(null);
        }
    }, [user?.currentPeriodEnd, user?.plan]);

    if (
        !user ||
        daysLeft === null ||
        user.subscriptionStatus !== "active" ||
        !planHasTrialCountdown(user.plan as "starter" | "growth" | "pro")
    ) {
        return null;
    }

    const percentage = Math.max(
        0,
        Math.min(100, (daysLeft / PREMIUM_TRIAL_DAYS) * 100),
    );
    const isWarning = daysLeft <= 5;

    return (
        <div className="flex items-center gap-2 sm:gap-3 mr-1">
            {isWarning && (
                <Link
                    href="/dashboard/settings/billing"
                    className="hidden sm:flex h-8 items-center justify-center rounded-md bg-destructive/10 px-3 text-[11px] font-semibold tracking-wide text-destructive hover:bg-destructive/20 transition-colors uppercase"
                >
                    Subscribe
                </Link>
            )}
            <div
                className="group relative flex items-center justify-center size-[34px] rounded-full bg-surface-elevated dark:bg-white/5 shadow-sm border border-black/5 dark:border-white/5"
                title={`${daysLeft} days left in trial`}
            >
                <svg className="size-[34px] -rotate-90" viewBox="0 0 36 36">
                    <path
                        className="text-muted/20 dark:text-white/10"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                        className={
                            isWarning
                                ? "text-destructive"
                                : "text-[#006c49] dark:text-[#6ffbbe]"
                        }
                        strokeDasharray={`${percentage}, 100`}
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                </svg>
                <span
                    className={`absolute text-[10px] font-bold ${
                        isWarning ? "text-destructive" : "text-foreground"
                    }`}
                >
                    {daysLeft}
                </span>
            </div>
        </div>
    );
}
