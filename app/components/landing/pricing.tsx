"use client";

import { Check, ChevronDown, Building2, ArrowRight } from "lucide-react";
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

const plans = PLANS;

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
      { name: "Expiry & Batch Tracking", starter: false, growth: false, pro: true },
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
      { name: "Audit Logs & Login History", starter: false, growth: false, pro: true },
      { name: "Register Open/Close & Reconciliation", starter: false, growth: false, pro: true },
      { name: "Approval Workflows & Restricted Discounts", starter: false, growth: false, pro: true },
    ],
  },
  {
    category: "Support & AI",
    items: [
      { name: "Zuri AI Assistant", starter: false, growth: false, pro: true },
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
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

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

  const handlePlanClick = (plan: (typeof plans)[0], cycle: BillingCycle) => {
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
          className="grid gap-8 lg:grid-cols-3 max-w-md mx-auto lg:max-w-none"
        >
          {plans.map((plan) => {
            const price =
              billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnually;
            const period = billingCycle === "monthly" ? "/mo" : "/yr";
            const badge = plan.badge;

            return (
              <motion.div
                key={plan.name}
                variants={cardVariants}
                whileHover={{ y: -5 }}
                className={`relative flex flex-col rounded-[2rem] p-8 transition-shadow duration-300 ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-[#003527] to-[#002118] text-white shadow-2xl ring-1 ring-[#006c49] lg:scale-105 z-10 hover:shadow-[#006c49]/20"
                    : "bg-surface-elevated border border-border/40 text-foreground hover:shadow-xl"
                }`}
              >
                {badge && (
                  <div
                    className={`absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow-lg ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-[#006c49] to-[#6ffbbe] text-white"
                        : "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                    }`}
                  >
                    {badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3
                    className={`text-2xl font-bold tracking-tight font-[family-name:var(--font-display)] ${
                      plan.highlighted ? "text-white" : ""
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`mt-3 text-sm leading-relaxed ${
                      plan.highlighted ? "text-white/80" : "text-muted-foreground"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6 flex items-baseline text-[56px] font-bold tracking-tight font-[family-name:var(--font-display)]">
                  <span
                    className={`text-2xl font-normal mr-1.5 ${
                      plan.highlighted ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    GHS
                  </span>
                  {price}
                  <span
                    className={`ml-1 text-lg font-medium ${
                      plan.highlighted ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    {period}
                  </span>
                </div>

                {plan.trialDays > 0 && (
                  <p
                    className={`mb-4 text-sm font-medium ${
                      plan.highlighted ? "text-[#6ffbbe]" : "text-[#006c49] dark:text-[#6ffbbe]"
                    }`}
                  >
                    {plan.trialDays}-day free trial included
                  </p>
                )}

                <div
                  className={`mb-8 rounded-xl p-4 text-sm leading-relaxed ${
                    plan.highlighted
                      ? "bg-white/10 text-white/90"
                      : "bg-secondary/5 text-foreground/80 border border-secondary/10"
                  }`}
                >
                  <span className="font-semibold block mb-1">Best for:</span>
                  {plan.bestFor}
                </div>

                <ul className="mb-10 flex flex-1 flex-col gap-4 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex flex-start gap-3">
                      <Check
                        className={`h-5 w-5 shrink-0 ${
                          plan.highlighted
                            ? "text-[#6ffbbe]"
                            : "text-[#006c49] dark:text-[#6ffbbe]"
                        }`}
                      />
                      <span
                        className={
                          plan.highlighted ? "text-white/90" : "text-muted-foreground"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanClick(plan, billingCycle)}
                  disabled={currentPlan === plan.id && !isPastDue}
                  className={`mt-auto flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold transition-all ${
                    currentPlan === plan.id && !isPastDue
                      ? "bg-surface-elevated text-muted-foreground border border-border cursor-not-allowed opacity-60"
                      : plan.highlighted
                        ? "bg-[#6ffbbe] text-[#002118] hover:brightness-110 shadow-[0_0_20px_rgba(111,251,190,0.3)]"
                        : onSelectPlan
                          ? "bg-[#006c49] text-white hover:bg-[#005a3c]"
                          : "bg-surface-container-lowest border border-border/40 hover:bg-surface-container-low"
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

        <div className="mt-24 border-t border-border/40 pt-16 text-center">
          <h3 className="mb-6 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Compare all features
          </h3>
          <button
            onClick={() => setShowCompare(!showCompare)}
            className="mx-auto flex h-12 items-center justify-center gap-2 rounded-full border border-border/50 bg-background px-8 text-sm font-semibold text-foreground transition-colors hover:bg-surface-elevated"
          >
            {showCompare ? "Hide comparison" : "View complete feature matrix"}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${
                showCompare ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`mt-12 overflow-hidden transition-all duration-500 ease-in-out ${
              showCompare ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="relative overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted">
              <div className="lg:hidden absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
              <table className="w-full text-left border-collapse min-w-[700px] lg:min-w-0">
                <thead>
                  <tr>
                    <th className="w-1/3 pb-6 pl-4 font-semibold text-muted-foreground">
                      Feature
                    </th>
                    <th className="pb-6 px-4 font-semibold text-center text-foreground text-lg">
                      Starter
                    </th>
                    <th className="pb-6 px-4 font-semibold text-center text-secondary text-lg">
                      Growth
                    </th>
                    <th className="pb-6 px-4 font-semibold text-center text-foreground text-lg">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((section, secIdx) => (
                    <React.Fragment key={secIdx}>
                      <tr>
                        <td
                          colSpan={4}
                          className="bg-surface-elevated/50 py-4 pl-4 font-bold text-foreground border-y border-border/20 uppercase tracking-widest text-xs"
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.items.map((item, itemIdx) => (
                        <tr
                          key={itemIdx}
                          className="border-b border-border/10 last:border-0 hover:bg-surface-elevated/20 transition-colors"
                        >
                          <td className="py-4 pl-4 text-sm font-medium text-foreground">
                            {item.name}
                          </td>
                          {[item.starter, item.growth, item.pro].map((val, i) => (
                            <td key={i} className="py-4 px-4 text-center">
                              {typeof val === "boolean" ? (
                                val ? (
                                  <Check className="mx-auto h-5 w-5 text-[#006c49] dark:text-[#6ffbbe]" />
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {val}
                                </span>
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
    </section>
  );
}
