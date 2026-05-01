"use client";

import { Check, ChevronDown, Building2, ArrowRight, X } from "lucide-react";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, Variants, AnimatePresence } from "motion/react";
import { PLANS, PlanId } from "@/config/plans";
import { PaymentFlow } from "@/app/components/billing/payment-flow";

type BillingCycle = "monthly" | "annually";

const plans = PLANS;

const comparisonFeatures = [
    {
        category: "Core POS & Inventory",
        items: [
            { name: "Branches", starter: "1 Branch", growth: "Multiple", pro: "Multiple" },
            { name: "POS Checkout & Receipts", starter: true, growth: true, pro: true },
            { name: "Stock Tracking & Low Alerts", starter: true, growth: true, pro: true },
            { name: "Stock Transfers", starter: false, growth: true, pro: true },
            { name: "Barcode Scanner Support", starter: false, growth: true, pro: true },
            { name: "Expiry & Batch Tracking", starter: false, growth: false, pro: true },
        ],
    },
    {
        category: "Staff & Management",
        items: [
            { name: "Basic Staff Roles (Admin, Cashier)", starter: true, growth: true, pro: true },
            { name: "Advanced Roles (Manager, Finance)", starter: false, growth: true, pro: true },
            { name: "Cashier Performance Tracking", starter: false, growth: true, pro: true },
            { name: "Audit Logs & Login History", starter: false, growth: false, pro: true },
            { name: "Register Open/Close & Reconciliation", starter: false, growth: false, pro: true },
            { name: "Approval Workflows & Overrides", starter: false, growth: false, pro: true },
        ],
    },
    {
        category: "Reporting & Support",
        items: [
            { name: "Basic Sales & Stock Reports", starter: true, growth: true, pro: true },
            { name: "Profit Summary & Expense Trends", starter: false, growth: true, pro: true },
            { name: "Branch Profitability Comparison", starter: false, growth: false, pro: true },
            { name: "Priority Support & Onboarding", starter: false, growth: false, pro: true },
        ],
    },
    {
        category: "AI",
        items: [
            { name: "Zuri (in-dashboard assistant, Pro)", starter: false, growth: false, pro: true },
        ],
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const cardVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.21, 0.47, 0.32, 0.98],
        },
    },
};

export function LandingPricing({ 
    defaultShowCompare = false,
    onSelectPlan,
    currentPlan,
    isPastDue = false
}: { 
    defaultShowCompare?: boolean;
    onSelectPlan?: (planId: PlanId, cycle: BillingCycle) => void;
    currentPlan?: PlanId;
    isPastDue?: boolean;
} = {}) {
    const router = useRouter();
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
    const [showCompare, setShowCompare] = useState(defaultShowCompare);

    // Pre-signup billing states
    const [billingStep, setBillingStep] = useState<"email" | "payment" | null>(null);
    const [preSignupEmail, setPreSignupEmail] = useState("");
    const [selectedPlanDetails, setSelectedPlanDetails] = useState<{ id: PlanId; cycle: BillingCycle; name: string; price: number } | null>(null);

    const handlePlanClick = (plan: typeof plans[0], cycle: BillingCycle) => {
        if (onSelectPlan) {
            onSelectPlan(plan.id as PlanId, cycle);
            return;
        }

        // The starter plan is a free trial, skip upfront payment
        if (plan.id === "starter") {
            const params = new URLSearchParams({
                plan: plan.id,
                cycle: cycle,
            });
            router.push(`/signup?${params.toString()}`);
            return;
        }

        // For paid plans, trigger pre-signup billing
        setSelectedPlanDetails({
            id: plan.id as PlanId,
            cycle,
            name: plan.name,
            price: cycle === "monthly" ? plan.priceMonthly : plan.priceAnnually
        });
        setBillingStep("email");
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (preSignupEmail.trim() && preSignupEmail.includes("@")) {
            setBillingStep("payment");
        }
    };

    const handleBillingSuccess = () => {
        if (!selectedPlanDetails) return;
        
        // Redirect to signup with email pre-filled and a flag indicating they've paid
        const params = new URLSearchParams({
            email: preSignupEmail,
            plan: selectedPlanDetails.id,
            cycle: selectedPlanDetails.cycle,
            paid: "true"
        });
        router.push(`/signup?${params.toString()}`);
    };

    return (
        <section className="relative overflow-hidden bg-background py-16 lg:py-24 text-foreground">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                {/* Header & Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="mx-auto max-w-3xl text-center mb-16 lg:mb-20"
                >
                    <h2 className="mb-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                        Pricing that grows with you
                    </h2>
                    <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
                        Affordable enough for small businesses, serious enough to inspire trust.
                        Start simple and upgrade smoothly as your operations expand.
                    </p>

                    <div className="inline-flex items-center rounded-full border border-border/50 bg-surface-elevated p-1 shadow-sm">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${billingCycle === "monthly"
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {billingCycle === "monthly" && (
                                <motion.div
                                    layoutId="billingToggle"
                                    className="absolute inset-0 rounded-full bg-background shadow-sm"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                />
                            )}
                            <span className="relative z-10">Monthly</span>
                        </button>
                        <button
                            onClick={() => setBillingCycle("annually")}
                            className={`relative flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${billingCycle === "annually"
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {billingCycle === "annually" && (
                                <motion.div
                                    layoutId="billingToggle"
                                    className="absolute inset-0 rounded-full bg-background shadow-sm"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                Annually
                                <span className="block rounded-full bg-[#6ffbbe]/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#006c49] dark:text-[#6ffbbe]">
                                    2 Months Free
                                </span>
                            </span>
                        </button>
                    </div>
                </motion.div>

                {/* Pricing Cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid gap-8 lg:grid-cols-3 max-w-md mx-auto lg:max-w-none"
                >
                    {plans.map((plan) => {
                        const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnually;
                        const period = billingCycle === "monthly" ? "/mo" : "/yr";

                        return (
                            <motion.div
                                key={plan.name}
                                variants={cardVariants}
                                whileHover={{ y: -5 }}
                                className={`relative flex flex-col rounded-[2rem] p-8 transition-shadow duration-300 ${plan.highlighted
                                    ? "bg-gradient-to-b from-[#003527] to-[#002118] text-white shadow-2xl ring-1 ring-[#006c49] lg:scale-105 z-10 hover:shadow-[#006c49]/20"
                                    : "bg-surface-elevated border border-border/40 text-foreground hover:shadow-xl"
                                    }`}
                            >
                                {plan.highlighted && (
                                    <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-gradient-to-r from-[#006c49] to-[#6ffbbe] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className={`text-2xl font-bold tracking-tight font-[family-name:var(--font-display)] ${plan.highlighted ? "text-white" : ""}`}>
                                        {plan.name}
                                    </h3>
                                    <p className={`mt-3 text-sm leading-relaxed ${plan.highlighted ? "text-white/80" : "text-muted-foreground"}`}>
                                        {plan.description}
                                    </p>
                                </div>

                                <div className="mb-6 flex items-baseline text-[56px] font-bold tracking-tight font-[family-name:var(--font-display)]">
                                    <span className={`text-2xl font-normal mr-1.5 ${plan.highlighted ? "text-white/60" : "text-muted-foreground"}`}>GHS</span>
                                    {price}
                                    <span className={`ml-1 text-lg font-medium ${plan.highlighted ? "text-white/60" : "text-muted-foreground"}`}>
                                        {period}
                                    </span>
                                </div>

                                <div className={`mb-8 rounded-xl p-4 text-sm leading-relaxed ${plan.highlighted ? "bg-white/10 text-white/90" : "bg-secondary/5 text-foreground/80 border border-secondary/10"}`}>
                                    <span className="font-semibold block mb-1">Best for:</span>
                                    {plan.bestFor}
                                </div>

                                <ul className="mb-10 flex flex-1 flex-col gap-4 text-sm">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex flex-start gap-3">
                                            <Check className={`h-5 w-5 shrink-0 ${plan.highlighted ? "text-[#6ffbbe]" : "text-[#006c49] dark:text-[#6ffbbe]"}`} />
                                            <span className={plan.highlighted ? "text-white/90" : "text-muted-foreground"}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handlePlanClick(plan, billingCycle)}
                                    disabled={currentPlan === plan.id && !isPastDue}
                                    className={`mt-auto flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold transition-all ${(currentPlan === plan.id && !isPastDue)
                                        ? "bg-surface-elevated text-muted-foreground border border-border cursor-not-allowed opacity-60"
                                        : plan.highlighted
                                            ? "bg-[#6ffbbe] text-[#002118] hover:brightness-110 shadow-[0_0_20px_rgba(111,251,190,0.3)]"
                                            : onSelectPlan ? "bg-[#006c49] text-white hover:bg-[#005a3c]" : "bg-surface-container-lowest border border-border/40 hover:bg-surface-container-low"
                                        }`}
                                >
                                    {currentPlan === plan.id 
                                        ? (isPastDue ? "Renew Plan" : "Active Plan") 
                                        : onSelectPlan 
                                            ? `Upgrade to ${plan.name}` 
                                            : plan.id === "starter"
                                                ? "Start your 30-day trial"
                                                : `Get Started with ${plan.name}`}
                                </button>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Custom/Enterprise Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-12 rounded-[2rem] border border-border/40 bg-surface-elevated p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8"
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <Building2 className="h-6 w-6 text-secondary" />
                            <h3 className="text-2xl font-bold font-[family-name:var(--font-display)]">Custom / Enterprise</h3>
                        </div>
                        <p className="text-muted-foreground leading-relaxed max-w-2xl">
                            Need tailored workflows, deep accounting/ERP integrations, custom branding, or a dedicated deployment for a large chain? We build custom systems starting from GHS 15,000.
                        </p>
                    </div>
                    <Link
                        href="/contact"
                        className="flex shrink-0 h-14 items-center justify-center gap-2 rounded-xl bg-foreground px-8 text-[15px] font-medium text-background transition-transform hover:scale-105"
                    >
                        Talk to Sales
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </motion.div>

                {/* Compare Features Expander */}
                <div className="mt-24 border-t border-border/40 pt-16 text-center">
                    <h3 className="mb-6 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
                        Compare all features
                    </h3>
                    <button
                        onClick={() => setShowCompare(!showCompare)}
                        className="mx-auto flex h-12 items-center justify-center gap-2 rounded-full border border-border/50 bg-background px-8 text-sm font-semibold text-foreground transition-colors hover:bg-surface-elevated"
                    >
                        {showCompare ? "Hide comparison" : "View complete feature matrix"}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showCompare ? "rotate-180" : ""}`} />
                    </button>

                    <div className={`mt-12 overflow-hidden transition-all duration-500 ease-in-out ${showCompare ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className="relative overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
                            <div className="lg:hidden absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                            <table className="w-full text-left border-collapse min-w-[700px] lg:min-w-0">
                                <thead>
                                    <tr>
                                        <th className="w-1/3 pb-6 pl-4 font-semibold text-muted-foreground">Feature</th>
                                        <th className="pb-6 px-4 font-semibold text-center text-foreground text-lg">Starter</th>
                                        <th className="pb-6 px-4 font-semibold text-center text-secondary text-lg">Growth</th>
                                        <th className="pb-6 px-4 font-semibold text-center text-foreground text-lg">Pro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonFeatures.map((section, secIdx) => (
                                        <React.Fragment key={secIdx}>
                                            <tr>
                                                <td colSpan={4} className="bg-surface-elevated/50 py-4 pl-4 font-bold text-foreground border-y border-border/20 uppercase tracking-widest text-xs">
                                                    {section.category}
                                                </td>
                                            </tr>
                                            {section.items.map((item, itemIdx) => (
                                                <tr key={itemIdx} className="border-b border-border/10 last:border-0 hover:bg-surface-elevated/20 transition-colors">
                                                    <td className="py-4 pl-4 text-sm font-medium text-foreground">{item.name}</td>
                                                    {[item.starter, item.growth, item.pro].map((val, i) => (
                                                        <td key={i} className="py-4 px-4 text-center">
                                                            {typeof val === "boolean" ? (
                                                                val ? <Check className="mx-auto h-5 w-5 text-[#006c49] dark:text-[#6ffbbe]" /> : <span className="text-muted-foreground/30">—</span>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">{val}</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>


            {/* Pre-signup Billing Modal */}
            <AnimatePresence>
                {billingStep && selectedPlanDetails && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setBillingStep(null)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-border/50 bg-surface-elevated p-8 shadow-2xl sm:p-10"
                        >
                            <button
                                onClick={() => setBillingStep(null)}
                                className="absolute right-6 top-6 rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {billingStep === "email" ? (
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                                            Start with {selectedPlanDetails.name}
                                    </h3>
                                    <p className="mt-2 text-[15px] text-muted-foreground">
                                        Enter the email address you'll use for your business account.
                                    </p>
                                </div>

                                <form onSubmit={handleEmailSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-medium text-muted-foreground ml-1">
                                            Business Email
                                        </label>
                                        <input
                                            autoFocus
                                            type="email"
                                            required
                                            value={preSignupEmail}
                                            onChange={(e) => setPreSignupEmail(e.target.value)}
                                            placeholder="e.g. hello@bakery.com"
                                            className="h-12 w-full rounded-2xl border border-border/60 bg-background px-4 text-[15px] outline-none transition-all focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/5"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#006c49] text-[15px] font-semibold text-white transition-all hover:bg-[#005a3c]"
                                    >
                                        Continue to Payment
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </form>

                                <div className="rounded-2xl bg-secondary/5 p-4 border border-secondary/10">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Selected Plan:</span>
                                        <span className="font-semibold text-foreground uppercase tracking-wider text-xs">
                                            {selectedPlanDetails.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total to pay:</span>
                                        <span className="font-bold text-foreground">
                                            GHS {selectedPlanDetails.price}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                <div>
                                    <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                                        Complete Payment
                                    </h3>
                                    <p className="mt-2 text-[15px] text-muted-foreground">
                                        Securely pay with Mobile Money to activate your plan.
                                    </p>
                                </div>

                                <PaymentFlow
                                    plan={selectedPlanDetails.id as any}
                                    cycle={selectedPlanDetails.cycle}
                                    amountGHS={selectedPlanDetails.price}
                                    preSignupEmail={preSignupEmail}
                                    onSuccess={handleBillingSuccess}
                                />
                            </div>
                        )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
}
