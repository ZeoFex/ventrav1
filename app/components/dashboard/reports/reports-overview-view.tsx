"use client";

import Link from "next/link";
import { ProductsPageShell } from "../products/products-page-shell";
import { TrendingUp, Package, Calculator, Clock } from "lucide-react";

const REPORTS = [
    {
        title: "Sales Summary",
        description: "View gross sales, net sales, profit margins, and top selling items.",
        icon: TrendingUp,
        href: "/dashboard/reports/sales-summary",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "End of Day (Z-Report)",
        description: "Daily register closures, cash drawer discrepancies, and shift totals.",
        icon: Clock,
        href: "/dashboard/reports/z-report",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "Inventory Valuation",
        description: "Current stock worth, low stock alerts, and COGS estimations.",
        icon: Package,
        href: "/dashboard/reports/inventory-valuation",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "Tax Liabilities",
        description: "Breakdown of collected taxes (VAT, NHIL, GETFund) for filing.",
        icon: Calculator,
        href: "/dashboard/reports/taxes",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
];

export function ReportsOverviewView() {
    return (
        <ProductsPageShell
            title="Report Center"
            description="Access comprehensive real-time reports for your business performance."
        >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REPORTS.map((report) => (
                    <Link
                        key={report.title}
                        href={report.href}
                        className="group flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-[#006c49]/30 hover:shadow-lg dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/30"
                    >
                        <div className={`mb-4 flex size-12 items-center justify-center rounded-xl ${report.colorClass}`}>
                            <report.icon className="size-6" />
                        </div>
                        <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
                            {report.title}
                        </h3>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                            {report.description}
                        </p>
                    </Link>
                ))}
            </div>
        </ProductsPageShell>
    );
}
