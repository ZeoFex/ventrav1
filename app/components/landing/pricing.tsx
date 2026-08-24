"use client";

import { Check, ChevronDown, Building2, ArrowRight, Minus } from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  PLANS,
  PlanId,
  getPlanCtaLabel,
} from "@/config/plans";

type BillingCycle = "monthly" | "annually";

const FEATURE_PREVIEW_COUNT = 5;

const comparisonFeatures = [
  {
    category: "Core POS & Inventory",
    items: [
      { name: "Branches", starter: "1", growth: "Up to 3", pro: "Up to 5" },
      { name: "POS Checkout & Digital Receipts", starter: true, growth: true, pro: true },
      { name: "Product Catalog", starter: true, growth: true, pro: true },
      { name: "View Current Stock Levels", starter: true, growth: true, pro: true },
      { name: "Basic Stock Increase/Decrease", starter: true, growth: true, pro: true },
      { name: "Stock Transfers", starter: false, growth: true, pro: true },
      { name: "Barcode Scanner Support", starter: false, growth: true, pro: true },
      { name: "Expiry & Batch Tracking", starter: false, growth: true, pro: true },
    ],
  },
  {
    category: "Customers, Suppliers & Finance",
    items: [
      { name: "Customer Records", starter: false, growth: true, pro: true },
      { name: "Supplier Management", starter: false, growth: true, pro: true },
      { name: "Expense Tracking", starter: false, growth: true, pro: true },
      { name: "Sales & Inventory Reports", starter: false, growth: true, pro: true },
      { name: "Profit & Loss Summaries", starter: false, growth: true, pro: true },
      { name: "Business Analytics", starter: false, growth: true, pro: true },
    ],
  },
  {
    category: "Staff & Management",
    items: [
      { name: "Staff Accounts", starter: "Up to 2", growth: "Up to 15", pro: "Unlimited" },
      { name: "Advanced Roles & Permissions", starter: false, growth: true, pro: true },
      { name: "Cashier Performance Tracking", starter: false, growth: true, pro: true },
      { name: "Refunds & Returns", starter: false, growth: true, pro: true },
      { name: "Register Open/Close & Reconciliation", starter: false, growth: false, pro: true },
      { name: "Approval Workflows & Restricted Discounts", starter: false, growth: false, pro: true },
    ],
  },
  {
    category: "Support & Scale",
    items: [
      { name: "Multi-terminal POS", starter: false, growth: false, pro: true },
      { name: "Priority Support & Assisted Onboarding", starter: false, growth: false, pro: true },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

const PLAN_COLUMN_KEYS = ["starter", "growth", "pro"] as const;

function CompareValue({
  value,
  compact = false,
}: {
  value: boolean | string;
  compact?: boolean;
}) {
  if (typeof value === "boolean") {
    return value ? (
      <span
        className={`mx-auto flex items-center justify-center rounded-full bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe] ${
          compact ? "size-7" : "size-8"
        }`}
        aria-label="Included"
      >
        <Check className={compact ? "size-3.5" : "size-4"} strokeWidth={2.5} aria-hidden />
      </span>
    ) : (
      <span
        className={`mx-auto flex items-center justify-center rounded-full bg-muted/40 text-muted-foreground/35 ${
          compact ? "size-7" : "size-8"
        }`}
        aria-label="Not included"
      >
        <Minus className={compact ? "size-3" : "size-3.5"} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={`inline-block text-center font-semibold tabular-nums text-foreground ${
        compact
          ? "max-w-full rounded-md bg-[#006c49]/8 px-1 py-0.5 text-[10px] leading-tight text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
          : "rounded-lg border border-[#bfc9c3]/25 bg-muted/30 px-2.5 py-1 text-xs dark:border-white/10 dark:bg-white/[0.04]"
      }`}
    >
      {value}
    </span>
  );
}

function CompareLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 px-3 py-3.5 text-[11px] text-muted-foreground sm:gap-8 sm:px-4 sm:py-4 sm:text-xs">
      <span className="inline-flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
        Included
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/40">
          <Minus className="size-3" />
        </span>
        Not on this plan
      </span>
    </div>
  );
}

function PricingCompareMatrix({
  billingCycle,
  showCompare,
  onToggle,
}: {
  billingCycle: BillingCycle;
  showCompare: boolean;
  onToggle: () => void;
}) {
  const period = billingCycle === "monthly" ? "/mo" : "/yr";
  const [openCategory, setOpenCategory] = useState(comparisonFeatures[0].category);
  const [mobilePlan, setMobilePlan] = useState<PlanId>("growth");

  return (
    <div id="pricing-compare" className="mt-16 scroll-mt-24 sm:mt-24">
      <div className="mx-auto mb-6 max-w-2xl text-center sm:mb-8">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006c49] dark:text-[#6ffbbe]">
          Full breakdown
        </p>
        <h3 className="font-[family-name:var(--font-display)] text-[1.65rem] font-bold tracking-tight sm:text-3xl md:text-4xl">
          Compare plans side by side
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          See exactly what&apos;s included in Starter, Growth, and Pro before you choose.
        </p>
        <button
          type="button"
          onClick={onToggle}
          className="mt-5 inline-flex h-11 w-full max-w-xs items-center justify-center gap-2 rounded-full border border-[#bfc9c3]/30 bg-surface-elevated px-6 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-[#006c49]/30 hover:bg-[#006c49]/5 sm:mt-6 sm:w-auto dark:border-white/10 dark:hover:border-[#6ffbbe]/30 dark:hover:bg-[#6ffbbe]/5"
        >
          {showCompare ? "Hide comparison" : "Compare features"}
          <ChevronDown
            className={`size-4 transition-transform duration-300 ${
              showCompare ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      <div
        className={`grid transition-all duration-500 ease-in-out ${
          showCompare
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden">
          {/* Mobile comparison — stacked accordion, no sideways scroll */}
          <div className="space-y-3 lg:hidden">
            <div className="sticky top-16 z-20 rounded-2xl border border-[#bfc9c3]/25 bg-background/90 p-1.5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#0c0c0c]/90">
              <div className="grid grid-cols-3 gap-1">
                {PLANS.map((plan) => {
                  const price =
                    billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnually;
                  const selected = mobilePlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setMobilePlan(plan.id)}
                      className={`rounded-[0.85rem] px-1 py-2.5 text-center transition-colors ${
                        selected
                          ? "bg-[#006c49] text-white shadow-md dark:bg-[#6ffbbe] dark:text-[#003527]"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <p className="text-[11px] font-bold leading-none">{plan.name}</p>
                      <p
                        className={`mt-1 text-[10px] font-semibold tabular-nums ${
                          selected ? "text-white/80 dark:text-[#003527]/70" : "text-muted-foreground"
                        }`}
                      >
                        {price === 0 ? "Free" : `GHS ${price.toLocaleString()}${period}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {comparisonFeatures.map((section) => {
              const isOpen = openCategory === section.category;
              return (
                <div
                  key={section.category}
                  className="overflow-hidden rounded-2xl border border-[#bfc9c3]/25 bg-surface-elevated dark:border-white/[0.08] dark:bg-[#111]"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenCategory(isOpen ? "" : section.category)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="h-4 w-1 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                      <span className="text-[13px] font-bold leading-snug text-foreground">
                        {section.category}
                      </span>
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen ? (
                    <div className="divide-y divide-[#bfc9c3]/10 border-t border-[#bfc9c3]/15 dark:divide-white/[0.06] dark:border-white/[0.06]">
                      {section.items.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-3 px-4 py-3.5"
                        >
                          <p className="min-w-0 text-[13px] font-medium leading-snug text-foreground">
                            {item.name}
                          </p>
                          <div className="shrink-0">
                            <CompareValue value={item[mobilePlan]} compact />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="rounded-2xl border border-[#bfc9c3]/20 bg-surface-elevated dark:border-white/[0.08] dark:bg-[#111]">
              <CompareLegend />
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-[#bfc9c3]/25 bg-surface-elevated shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-[#111] dark:shadow-none lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#bfc9c3]/20 dark:border-white/[0.08]">
                    <th className="min-w-[14rem] bg-surface-elevated px-6 py-5 dark:bg-[#111]">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Features
                      </span>
                    </th>
                    {PLANS.map((plan) => {
                      const price =
                        billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnually;
                      const isGrowth = plan.id === "growth";
                      return (
                        <th
                          key={plan.id}
                          className={`min-w-[9rem] px-4 py-5 text-center ${
                            isGrowth ? "bg-[#006c49]/[0.06] dark:bg-[#6ffbbe]/[0.06]" : ""
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {plan.badge && isGrowth ? (
                              <span className="rounded-full bg-[#006c49] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
                                {plan.badge}
                              </span>
                            ) : (
                              <span className="h-[18px]" aria-hidden />
                            )}
                            <span
                              className={`font-[family-name:var(--font-display)] text-lg font-bold ${
                                isGrowth ? "text-[#006c49] dark:text-[#6ffbbe]" : "text-foreground"
                              }`}
                            >
                              {plan.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {price === 0 ? (
                                "Free"
                              ) : (
                                <>
                                  GHS {price.toLocaleString()}
                                  <span className="text-[10px]">{period}</span>
                                </>
                              )}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((section) => (
                    <React.Fragment key={section.category}>
                      <tr>
                        <td
                          colSpan={4}
                          className="border-y border-[#bfc9c3]/15 bg-muted/30 px-6 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-1 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                              {section.category}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {section.items.map((item) => (
                        <tr
                          key={item.name}
                          className="border-b border-[#bfc9c3]/10 last:border-0 hover:bg-muted/20 dark:border-white/[0.04]"
                        >
                          <td className="bg-surface-elevated px-6 py-4 text-sm font-medium leading-snug text-foreground dark:bg-[#111]">
                            {item.name}
                          </td>
                          {PLAN_COLUMN_KEYS.map((key, colIdx) => (
                            <td
                              key={key}
                              className={`px-4 py-4 text-center ${
                                colIdx === 1 ? "bg-[#006c49]/[0.04] dark:bg-[#6ffbbe]/[0.04]" : ""
                              }`}
                            >
                              <CompareValue value={item[key]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#bfc9c3]/15 dark:border-white/[0.06]">
              <CompareLegend />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPricing({
  defaultShowCompare = false,
  onSelectPlan,
  currentPlan,
  isPastDue = false,
}: {
  defaultShowCompare?: boolean;
  onSelectPlan?: (planId: PlanId, cycle: BillingCycle) => void;
  currentPlan?: PlanId;
  isPastDue?: boolean;
} = {}) {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [showCompare, setShowCompare] = useState(defaultShowCompare);

  const handlePlanClick = (plan: (typeof PLANS)[0], cycle: BillingCycle) => {
    if (onSelectPlan) {
      onSelectPlan(plan.id as PlanId, cycle);
      return;
    }

    const params = new URLSearchParams({
      plan: plan.id,
      cycle,
    });
    router.push(`/signup?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-background py-16 lg:py-24 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
            Start free on Starter, or try Growth and Pro with a 14-day trial. Upgrade
            anytime as your operations expand.
          </p>

          <div className="inline-flex items-center rounded-full border border-border/50 bg-surface-elevated p-1 shadow-sm">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                billingCycle === "monthly"
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
              className={`relative flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                billingCycle === "annually"
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

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid items-start gap-6 lg:grid-cols-3 lg:gap-5 max-w-md mx-auto lg:max-w-none"
        >
          {PLANS.map((plan) => {
            const price =
              billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnually;
            const period = billingCycle === "monthly" ? "/mo" : "/yr";
            const badge = plan.badge;

            return (
              <motion.div
                key={plan.name}
                variants={cardVariants}
                whileHover={{ y: -4 }}
                className={`relative flex flex-col rounded-2xl p-5 sm:p-6 transition-shadow duration-300 ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-[#003527] to-[#002118] text-white shadow-2xl ring-1 ring-[#006c49] lg:scale-[1.03] z-10 hover:shadow-[#006c49]/20"
                    : "bg-surface-elevated border border-border/40 text-foreground hover:shadow-lg"
                }`}
              >
                {badge && (
                  <div
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide shadow-md ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-[#006c49] to-[#6ffbbe] text-white"
                        : "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                    }`}
                  >
                    {badge}
                  </div>
                )}

                <div className="mb-4 pt-1">
                  <h3
                    className={`text-xl font-bold tracking-tight font-[family-name:var(--font-display)] ${
                      plan.highlighted ? "text-white" : ""
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`mt-1.5 text-[13px] leading-snug line-clamp-2 ${
                      plan.highlighted ? "text-white/75" : "text-muted-foreground"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <div className="mb-4 flex items-end gap-1 font-[family-name:var(--font-display)]">
                  <span
                    className={`pb-1 text-sm font-medium ${
                      plan.highlighted ? "text-white/55" : "text-muted-foreground"
                    }`}
                  >
                    GHS
                  </span>
                  <span className="text-4xl font-bold leading-none tracking-tight sm:text-[2.75rem]">
                    {price}
                  </span>
                  <span
                    className={`pb-1 text-sm font-medium ${
                      plan.highlighted ? "text-white/55" : "text-muted-foreground"
                    }`}
                  >
                    {period}
                  </span>
                </div>

                {plan.trialDays > 0 ? (
                  <p
                    className={`mb-4 text-xs font-semibold ${
                      plan.highlighted ? "text-[#6ffbbe]" : "text-[#006c49] dark:text-[#6ffbbe]"
                    }`}
                  >
                    {plan.trialDays}-day free trial
                  </p>
                ) : null}

                <ul className="mb-4 space-y-2 text-[13px] leading-snug">
                  {plan.features.slice(0, FEATURE_PREVIEW_COUNT).map((feature, idx) => (
                    <li key={idx} className="flex gap-2">
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${
                          plan.highlighted
                            ? "text-[#6ffbbe]"
                            : "text-[#006c49] dark:text-[#6ffbbe]"
                        }`}
                      />
                      <span
                        className={
                          plan.highlighted ? "text-white/85" : "text-muted-foreground"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.features.length > FEATURE_PREVIEW_COUNT ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompare(true);
                      document
                        .getElementById("pricing-compare")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`mb-5 text-left text-xs font-semibold underline-offset-2 hover:underline ${
                      plan.highlighted
                        ? "text-[#6ffbbe]"
                        : "text-[#006c49] dark:text-[#6ffbbe]"
                    }`}
                  >
                    + {plan.features.length - FEATURE_PREVIEW_COUNT} more — see full comparison
                  </button>
                ) : (
                  <div className="mb-5" />
                )}

                <button
                  onClick={() => handlePlanClick(plan, billingCycle)}
                  disabled={currentPlan === plan.id && !isPastDue}
                  className={`mt-auto flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    currentPlan === plan.id && !isPastDue
                      ? "cursor-not-allowed border border-border bg-surface-elevated text-muted-foreground opacity-60"
                      : "bg-[#6ffbbe] text-[#002118] shadow-[0_0_20px_rgba(111,251,190,0.3)] hover:brightness-110"
                  }`}
                >
                  {currentPlan === plan.id
                    ? isPastDue
                      ? "Renew Plan"
                      : "Active Plan"
                    : onSelectPlan
                      ? `Upgrade to ${plan.name}`
                      : getPlanCtaLabel(plan.id)}
                </button>
              </motion.div>
            );
          })}
        </motion.div>

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
              <h3 className="text-2xl font-bold font-[family-name:var(--font-display)]">
                Custom / Enterprise
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              Need tailored workflows, deep accounting/ERP integrations, custom
              branding, or a dedicated deployment for a large chain? We build custom
              systems starting from GHS 15,000.
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

        <PricingCompareMatrix
          billingCycle={billingCycle}
          showCompare={showCompare}
          onToggle={() => setShowCompare(!showCompare)}
        />
      </div>
    </section>
  );
}
