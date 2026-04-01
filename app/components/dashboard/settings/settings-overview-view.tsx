"use client";

import Link from "next/link";
import { Store, Receipt, Bell } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";

const SETTINGS_CATEGORIES = [
    {
        title: "Business Profile",
        description: "Manage your company details, address, and operating hours.",
        icon: Store,
        href: "/dashboard/settings/profile",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "Receipt & Tax",
        description: "Customize receipt layouts and configure global tax schedules.",
        icon: Receipt,
        href: "/dashboard/settings/receipt",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "Notifications",
        description: "Set up email alerts for low stock and end-of-day summaries.",
        icon: Bell,
        href: "/dashboard/settings/notifications",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
];

export function SettingsOverviewView() {
    return (
        <ProductsPageShell
            title="Settings"
            description="Manage your VentraPOS account, business profile, and application preferences."
        >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SETTINGS_CATEGORIES.map((category) => (
                    <Link
                        key={category.title}
                        href={category.href}
                        className="group flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:border-[#006c49]/30 hover:shadow-lg dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/30"
                    >
                        <div className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-transform group-hover:bg-[#006c49] group-hover:text-white dark:group-hover:bg-[#6ffbbe] dark:group-hover:text-black ${category.colorClass}`}>
                            <category.icon className="size-6" />
                        </div>
                        <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
                            {category.title}
                        </h3>
                        <p className="text-[13px] leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors">
                            {category.description}
                        </p>
                    </Link>
                ))}
            </div>
        </ProductsPageShell>
    );
}
