"use client";

import { BarChart3, LayoutDashboard, LucideIcon, Package, Play, Users } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface TabItem {
    id: string;
    label: string;
    icon: LucideIcon;
    description: string;
    image: string;
}

const tabs: TabItem[] = [
    {
        id: "pos",
        label: "POS Checkout",
        icon: LayoutDashboard,
        description: "Experience the fastest checkout flow for retail. Scan barcodes, apply discounts, and process payments in seconds.",
        image: "/landing/ventra.jpg", // Reusing hero image as placeholder for now
    },
    {
        id: "inventory",
        label: "Inventory Management",
        icon: Package,
        description: "Keep track of every item across all branches. Set reorder points and get automated low-stock alerts.",
        image: "/landing/ventra.jpg",
    },
    {
        id: "staff",
        label: "Staff Monitoring",
        icon: Users,
        description: "Assign roles and track individual performance. Secure logins ensure every transaction is auditable.",
        image: "/landing/ventra.jpg",
    },
    {
        id: "reports",
        label: "Business Reports",
        icon: BarChart3,
        description: "Turn sales data into growth strategies. Export daily reports on revenue, expenses, and net profit.",
        image: "/landing/ventra.jpg",
    },
];

export function LandingWalkthrough() {
    const [activeTab, setActiveTab] = useState(tabs[0].id);

    const active = tabs.find((t) => t.id === activeTab) || tabs[0];

    return (
        <section className="relative overflow-hidden bg-background py-16 lg:py-24 text-foreground">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="mb-16 flex flex-col items-center text-center"
                >
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">
                        <span className="size-1.5 rounded-full bg-secondary animate-pulse" />
                        How it works
                    </div>
                    <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                        Learn How to Use Our App
                    </h2>
                    <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
                        Get started quickly and easily. Follow simple steps to
                        integrate Ventra with your business and start selling today.
                    </p>
                </motion.div>

                {/* Tabs Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-12 flex justify-center"
                >
                    <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-surface-container-low p-1.5 dark:bg-white/[0.03]">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-2.5 rounded-xl px-4 py-2 text-[14px] font-medium transition-all ${activeTab === tab.id
                                    ? "text-white"
                                    : "text-muted-foreground hover:text-foreground hover:bg-surface-container-high/50 dark:hover:bg-white/5"
                                    }`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-xl bg-secondary shadow-lg shadow-secondary/20"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                    />
                                )}
                                <tab.icon className="relative z-10 size-4" />
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 30 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    className="relative group mx-auto max-w-5xl"
                >
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] bg-surface-container-low shadow-2xl transition-all dark:bg-white/[0.02] dark:shadow-none">
                        {/* Featured Image */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                                className="absolute inset-0"
                            >
                                <Image
                                    src={active.image}
                                    alt={active.label}
                                    fill
                                    className="object-cover opacity-90 transition-opacity duration-500 group-hover:opacity-100"
                                    sizes="(max-width: 1024px) 100vw, 1024px"
                                    priority
                                />
                                {/* Overlay depth */}
                                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
                            </motion.div>
                        </AnimatePresence>

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex size-16 items-center justify-center rounded-full bg-secondary shadow-xl shadow-secondary/40 text-white transition-transform duration-300"
                            >
                                <Play className="ml-1 size-7 fill-white" />
                            </motion.button>
                        </div>

                        {/* Feature Info floating bottom */}
                        <motion.div
                            key={activeTab + "-info"}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="absolute bottom-8 left-8 right-8 flex flex-col items-start lg:max-w-md"
                        >
                            <div className="rounded-xl bg-background/40 backdrop-blur-xl border border-white/10 p-6 text-white shadow-2xl">
                                <h3 className="mb-2 text-xl font-semibold tracking-tight">{active.label}</h3>
                                <p className="text-sm leading-relaxed text-white/80">
                                    {active.description}
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Ambient Glows */}
                    <div className="absolute -left-20 -top-20 -z-10 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
                    <div className="absolute -bottom-20 -right-20 -z-10 h-64 w-64 rounded-full bg-secondary/10 blur-[100px]" />
                </motion.div>
            </div>
        </section>
    );
}
