"use client";

import Link from "next/link";
import { PLANS, PlanId } from "@/config/plans";
import { useSession } from "@/app/components/auth/use-session";
import { PaymentFlow } from "@/app/components/billing/payment-flow";
import { LandingPricing } from "@/app/components/landing/pricing";
import { Zap, CheckCircle2, History, MessageSquare, X, Smartphone, Gift, ArrowRight } from "lucide-react";
import { useState } from "react";

export function BillingSettingsView() {
    const { user, mutate } = useSession();
    const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
    const [selectedCycle, setSelectedCycle] = useState<"monthly" | "annually">("monthly");
    const [isUpgrading, setIsUpgrading] = useState(false);

    const currentPlan = (user?.plan as PlanId) || "starter";
    const currentPlanDetails = PLANS.find((p) => p.id === currentPlan);

    const handleSuccess = async () => {
        // Force a fresh session fetch from the DB  (plan was already updated by the
        // status endpoint that PaymentFlow calls before showing the success screen)
        await mutate(undefined, { revalidate: true });

        setSelectedPlan(null);
        setIsUpgrading(false);

        // Belt-and-suspenders: if SWR still cached the old plan, hard-reload
        // We need to re-check from the DOM because `user` is a stale closure here
        setTimeout(async () => {
            const fresh = await fetch("/api/auth/session").then(r => r.json());
            if (fresh?.user?.plan === "starter") {
                window.location.reload();
            }
        }, 500);
    };

    // ── Upgrade: payment flow for selected plan ──────────────────
    if (isUpgrading && selectedPlan) {
        return (
            <div className="max-w-4xl mx-auto py-6">
                <button
                    onClick={() => setSelectedPlan(null)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground mb-8 flex items-center gap-2 transition-colors"
                >
                    <X className="size-4" /> Back to Plans
                </button>
                <div className="bg-surface-elevated/50 border border-border/50 rounded-3xl p-8 shadow-sm">
                    <PaymentFlow
                        plan={selectedPlan as "starter" | "growth" | "pro"}
                        cycle={selectedCycle}
                        onSuccess={handleSuccess}
                    />
                </div>
            </div>
        );
    }

    // ── Upgrade: plan picker ─────────────────────────────────────
    if (isUpgrading) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="max-w-7xl mx-auto px-6 pt-6 -mb-8 relative z-10">
                    <button
                        onClick={() => setIsUpgrading(false)}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                    >
                        <X className="size-4" /> Cancel Upgrade
                    </button>
                </div>
                
                <LandingPricing 
                    defaultShowCompare={false} 
                    currentPlan={currentPlan}
                    isPastDue={user?.subscriptionStatus === "past_due"}
                    onSelectPlan={(id, cycle) => {
                        setSelectedCycle(cycle);
                        setSelectedPlan(id);
                    }} 
                />
            </div>
        );
    }

    // ── Main billing overview ────────────────────────────────────
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {user?.role === "owner" && (
                <Link
                    href="/dashboard/settings/referrals"
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[#006c49]/20 bg-[#003527]/5 p-5 transition-colors hover:bg-[#003527]/10 dark:border-[#6ffbbe]/20 dark:bg-[#6ffbbe]/5 dark:hover:bg-[#6ffbbe]/10"
                >
                    <div className="flex min-w-0 gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#003527]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                            <Gift className="size-5" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-foreground">Referrals</h3>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Your link, activity, and subscription rewards — open Referrals to manage.
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
            )}
            {/* Current Plan Card */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-[2.5rem] border border-[#006c49]/10 bg-gradient-to-br from-[#003527] to-[#014d3a] p-10 text-white shadow-2xl relative overflow-hidden">
                    <Zap className="absolute top-[-20px] right-[-20px] size-64 text-white/[0.03] rotate-12" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
                            Current Plan
                        </div>
                        <h2 className="mt-4 text-[42px] font-bold tracking-tight leading-none capitalize">
                            Ventra {currentPlan}
                        </h2>
                        <p className="mt-3 text-[16px] text-white/70 max-w-sm">
                            {currentPlanDetails?.description || "The essentials you need to start your retail journey."}
                        </p>

                        {/* Dynamic feature chips from the plan config */}
                        <div className="mt-8 flex flex-wrap gap-3">
                            {(currentPlanDetails?.features || []).slice(0, 4).map((feat, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-[#6ffbbe]" />
                                    <span className="text-[14px] font-medium text-white/90">{feat}</span>
                                </div>
                            ))}
                        </div>

                        {(currentPlan !== "pro" || user?.subscriptionStatus === "past_due") && (
                            <button
                                onClick={() => setIsUpgrading(true)}
                                className="mt-10 rounded-2xl bg-[#6ffbbe] px-8 py-4 text-[15px] font-bold text-[#003527] shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                            >
                                {user?.subscriptionStatus === "past_due" ? "Renew Subscription" : "View Upgrade Options"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-[2.5rem] border border-[#eef0f2] bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#111]">
                    <h3 className="text-[18px] font-semibold mb-6">Payment Method</h3>
                    <div className="rounded-2xl border border-[#eef0f2] p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                                <Smartphone className="size-5" />
                            </div>
                            <div>
                                <p className="text-[14px] font-bold">Mobile Money</p>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Paystack MoMo</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-[#f0f2f4] dark:border-white/[0.06]">
                        <p className="text-[13px] text-muted-foreground mb-4">Need help with billing?</p>
                        <button className="flex items-center gap-2 text-[14px] font-bold text-[#006c49] dark:text-[#6ffbbe] hover:underline">
                            <MessageSquare className="size-4" />
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>

            {/* Billing History */}
            <div className="rounded-[2.5rem] border border-[#eef0f2] bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#111]">
                <div className="flex items-center gap-3 mb-8">
                    <div className="rounded-2xl bg-[#f4f5f7] p-3 dark:bg-white/5">
                        <History className="size-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-[20px] font-semibold tracking-tight">Billing History</h3>
                </div>

                <div className="py-12 text-center text-muted-foreground">
                    <p className="text-sm">No billing history yet.</p>
                </div>
            </div>
        </div>
    );
}
