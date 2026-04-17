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
    description: "Perfect for growing businesses with multiple branches.",
    features: ["Multiple Branches", "Advanced Roles", "Revenue Analytics", "Stock Transfers", "Barcode Scanner Support"],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    priceGHS: 300,
    description: "Advanced controls and governance for serious operations.",
    features: ["Unlimited Everything", "Register Controls", "Expiry & Batch Tracking", "Z-Reports", "Audit Logs & Approvals"],
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

  if (selectedPlan && selectedPlan !== "starter") {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <button 
          onClick={() => setSelectedPlan(null)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground mb-8"
        >
          &larr; Back to plans
        </button>
        <PaymentFlow 
          plan={selectedPlan as "growth" | "pro"} 
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
          Choose a plan below to unlock premium features and grow your business.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          // Starter can upgrade to growth or pro. Growth can upgrade to pro. Pro cannot upgrade anywhere.
          const isUpgradeAllowed = 
            (currentPlan === "starter") || 
            (currentPlan === "growth" && plan.id === "pro");

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
                <span className="text-4xl font-bold tracking-tight">GHS {plan.priceGHS}</span>
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">/ month</span>
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
                disabled={isCurrentPlan || !isUpgradeAllowed}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  isCurrentPlan
                  ? "bg-surface-elevated text-muted-foreground border border-border cursor-not-allowed"
                  : isUpgradeAllowed
                    ? "bg-[#006c49] text-white hover:bg-[#005a3c] dark:bg-[#6ffbbe] dark:text-[#003527] dark:hover:bg-[#5debb0]"
                    : "bg-surface text-muted-foreground border border-border cursor-not-allowed"
                }`}
              >
                {isCurrentPlan 
                  ? "Active Plan" 
                  : isUpgradeAllowed 
                    ? `Upgrade to ${plan.name}` 
                    : "Included in Pro"}
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
