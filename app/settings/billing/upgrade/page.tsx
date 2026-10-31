"use client";

import { useSession } from "@/app/components/auth/use-session";
import { PaymentFlow } from "@/app/components/billing/payment-flow";
import { PlanId } from "@/config/plan-feature-access";
import { Check, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PLANS = [
  {
    id: "growth" as PlanId,
    name: "Growth",
    priceGHS: 150,
    custom: false,
    description: "The full shop system: branches, register controls, approvals, and reports.",
    features: [
      "Up to 5 branches",
      "Advanced roles and stock transfers",
      "Register open, close, and cash reconciliation",
      "Approval workflows and restricted discounts",
      "Z-reports, audit logs, and barcode scanning",
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    priceGHS: 0,
    custom: true,
    description: "Hire our team, or let us build a custom system for your shop.",
    features: [
      "We set up and run VentraPOS with you",
      "Or we build a custom system around how you work",
    ],
  },
];

export default function UpgradePage() {
  const { user, mutate } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  const currentPlan = (user?.plan as PlanId) || "starter";

  const handleSuccess = async () => {
    // Refresh session to get new plan
    await mutate();
    router.push("/dashboard");
  };

  if (selectedPlan === "growth") {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <button 
          onClick={() => setSelectedPlan(null)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground mb-8"
        >
          &larr; Back to plans
        </button>
        <PaymentFlow 
          plan="growth" 
          cycle="monthly"
          onSuccess={handleSuccess} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Upgrade your VentraPOS Plan
        </h1>
        <p className="text-lg text-muted-foreground">
          You are currently on the <span className="font-semibold text-foreground capitalize">{currentPlan}</span> plan. 
          Growth includes the full toolkit. Pro is a custom hire, or a system we build for you.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id && !plan.custom;
          const isUpgradeAllowed = plan.id === "growth" && currentPlan === "starter";
          const canTalk = plan.custom;

          return (
            <div 
              key={plan.id}
              className={`relative flex flex-col p-8 rounded-3xl border bg-surface-elevated/50 shadow-sm transition-all duration-300 ${
                isCurrentPlan 
                ? "border-[#006c49]/50 dark:border-[#6ffbbe]/50 ring-1 ring-[#006c49]/20 shadow-md" 
                : "border-border/60 hover:border-[#006c49]/30 hover:shadow-md dark:hover:border-[#6ffbbe]/30"
              }`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#006c49] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                  Current Plan
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold capitalize">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-2 min-h-[40px]">{plan.description}</p>
              </div>

              <div className="mb-8">
                {plan.custom ? (
                  <span className="text-4xl font-bold tracking-tight">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold tracking-tight">GHS {plan.priceGHS}</span>
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">/ month</span>
                  </>
                )}
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="size-5 shrink-0 text-[#006c49] dark:text-[#6ffbbe] mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={!canTalk && (isCurrentPlan || !isUpgradeAllowed)}
                onClick={() => {
                  if (plan.custom) {
                    router.push("/contact");
                    return;
                  }
                  setSelectedPlan(plan.id);
                }}
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  !canTalk && (isCurrentPlan || !isUpgradeAllowed)
                  ? "bg-surface-elevated text-muted-foreground border border-border cursor-not-allowed"
                  : "bg-[#006c49] text-white hover:bg-[#005a3c] dark:bg-[#6ffbbe] dark:text-[#003527] dark:hover:bg-[#5debb0]"
                }`}
              >
                {plan.custom
                  ? "Hire us or request a custom build"
                  : isCurrentPlan
                    ? "Active Plan"
                    : isUpgradeAllowed
                      ? "Upgrade to Growth"
                      : "Included in Growth"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Shield className="size-4 opacity-70" />
        <span>Payments are securely processed via Paystack Mobile Money.</span>
      </div>
    </div>
  );
}
