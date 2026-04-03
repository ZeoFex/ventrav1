"use client";

import { ArrowUpRight, ShoppingCart, CreditCard, Globe, Tag, ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { motion, Variants } from "motion/react";

const features = [
    {
        title: "Secure Payment Processing",
        description:
            "Process payments quickly and securely with Ventra's integrated payment solutions. Protect your transactions and provide a smooth checkout.",
        icon: CreditCard,
    },
    {
        title: "Inventory Tracking",
        description:
            "Keep track of all your inventory in real-time. Avoid stockouts and overstocks with accurate inventory tracking and automated alerts.",
        icon: Tag,
    },
    {
        title: "Multi-Location Support",
        description:
            "Manage multiple business locations from a single dashboard. Centralize your operations and maintain consistency across all your outlets.",
        icon: Globe,
    },
    {
        title: "Fast POS Checkout",
        description:
            "Process sales lightning fast with our intuitive Point of Sale interface. Supports barcode scanning, digital receipts, and split payments effortlessly.",
        icon: ShoppingCart,
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

const itemVariants: Variants = {
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

export function LandingFeatures() {
    return (
        <section className="relative overflow-hidden bg-background py-16 lg:py-24 text-foreground">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                    {/* Left Column */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="flex flex-col justify-center max-w-lg"
                    >
                        {/* Badge */}
                        <div className="mb-6 inline-flex w-fit items-center rounded-full border border-border/50 bg-secondary/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            TOP FEATURES
                        </div>

                        {/* Heading */}
                        <h2 className="mb-6 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-[56px] lg:leading-[1.1]">
                            Unleashing Power<br className="hidden lg:block" /> Through Features
                        </h2>

                        {/* Description */}
                        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                            Ventra comes with a variety of advanced features designed to
                            help you manage your business better and more efficiently. Discover
                            our top features that will transform the way you operate.
                        </p>

                        {/* CTA */}
                        <div>
                            <Link
                                href="/features"
                                className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-8 text-[15px] font-medium text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)]"
                            >
                                View All Features
                            </Link>
                        </div>
                    </motion.div>

                    {/* Right Column: Features List */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="flex flex-col gap-4"
                    >
                        {features.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={idx}
                                    variants={itemVariants}
                                    className="group relative cursor-pointer rounded-2xl border border-border/40 bg-card/40 p-5 transition-all hover:bg-card/80 hover:border-border/80 dark:bg-white/[0.02] dark:border-white/5 dark:hover:bg-white/[0.04] dark:hover:border-white/10"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Icon Container */}
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/60 dark:bg-white/10">
                                                <Icon
                                                    strokeWidth={2}
                                                    className="size-5 text-foreground"
                                                />
                                            </div>
                                            <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
                                                {feature.title}
                                            </h3>
                                        </div>
                                        {/* Arrow Icon */}
                                        <ArrowUpRight className="size-5 text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                                    </div>
                                    <p className="text-[15px] leading-relaxed text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                    {/* View All Features Link (Mobile/Bottom) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 }}
                        className="mt-2 flex justify-end lg:col-start-2"
                    >
                        <Link
                            href="/features"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#006c49] transition-colors hover:text-[#003527] dark:text-[#6ffbbe] dark:hover:text-white"
                        >
                            Explore all platform features
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
