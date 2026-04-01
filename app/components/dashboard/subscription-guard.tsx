"use client";

import { useSession } from "@/app/components/auth/use-session";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useSession();
    const pathname = usePathname();

    if (isLoading || !user) {
        return <>{children}</>;
    }

    // Allow access to Home and Billing Settings
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/settings/billing")) {
        return <>{children}</>;
    }

    // Lock if past due
    if (user.subscriptionStatus === "past_due") {
        return (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-8 text-center bg-background/50 rounded-xl my-4 mx-4 border border-border">
                <div className="rounded-full bg-destructive/10 p-4 mb-4">
                    <Lock className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Subscription Expired</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                    Your initial VentraPOS subscription cycle has ended. Please renew your plan to unlock all features and continue managing your business.
                </p>
                <a
                    href="/dashboard/settings/billing"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-8"
                >
                    Renew Plan
                </a>
            </div>
        );
    }

    return <>{children}</>;
}
