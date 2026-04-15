"use client";

import { useSession } from "@/app/components/auth/use-session";
import { STARTER_TRIAL_DAYS } from "@/config/plans";
import { Clock } from "lucide-react";
import Link from "next/link";

export function TrialBanner() {
    const { user, isLoading } = useSession();

    if (isLoading || !user) return null;
    if (user.plan !== "starter") return null;
    if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "past_due") return null;
    if (!user.currentPeriodEnd) return null;

    const endDate = new Date(user.currentPeriodEnd);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

    // Hide if period end is absurdly far out (bad data); allow 31 days due to ceil/timezones
    if (daysLeft > STARTER_TRIAL_DAYS + 5) return null;

    const showRenew = daysLeft <= 5;
    const isExpired = daysLeft <= 0;

    return (
        <div className="sticky top-0 z-[40] bg-primary text-primary-foreground px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm font-medium shadow-md">
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                    {isExpired ? (
                        <span className="font-bold">Your trial has expired.</span>
                    ) : (
                        <>
                            You have{" "}
                            <span className="font-bold">
                                {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                            </span>{" "}
                            on your Starter plan — first month on us (30-day trial).
                        </>
                    )}
                </span>
            </div>
            {(showRenew || isExpired) && (
                <Link
                    href="/dashboard/settings/billing"
                    className="bg-background text-foreground hover:bg-background/90 px-3 py-1 rounded-md text-xs font-semibold shadow-sm transition-colors"
                >
                    {isExpired ? "Renew Subscription" : "Upgrade Now"}
                </Link>
            )}
        </div>
    );
}
