"use client";

import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import React from "react";
import { motion } from "motion/react";

const footerLinks = {
    product: [
        { name: "Features", href: "/features" },
        { name: "Pricing", href: "/pricing" },
        { name: "Changelog", href: "/changelog" },
        { name: "Hardware", href: "/hardware" },
    ],
    solutions: [
        { name: "Supermarkets", href: "/solutions/supermarkets" },
        { name: "Pharmacies", href: "/solutions/pharmacies" },
        { name: "Restaurants", href: "/solutions/restaurants" },
        { name: "Boutiques", href: "/solutions/boutiques" },
    ],
    company: [
        { name: "About Us", href: "/about" },
        { name: "Careers", href: "/career" },
        { name: "Blog", href: "/blog" },
        { name: "Contact", href: "/contact" },
    ],
    legal: [
        { name: "Privacy Policy", href: "/privacy" },
        { name: "Terms of Service", href: "/terms" },
        { name: "Help Center", href: "/help" },
    ],
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants: any = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.21, 0.47, 0.32, 0.98],
        },
    },
};

export function SiteFooter() {
    return (
        <footer className="bg-background pt-20 pb-8 border-t border-border/40">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                {/* Footer Links Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    className="grid gap-12 lg:grid-cols-5 lg:gap-8 mb-16"
                >
                    {/* Brand Column */}
                    <motion.div variants={itemVariants} className="flex flex-col lg:col-span-2">
                        <Link href="/" className="mb-6 inline-block font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-foreground">
                            VentraPOS
                        </Link>
                        <p className="mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
                            The cloud-based POS dashboard app designed to help businesses efficiently manage sales, inventory, customers, and reporting in real-time.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest border border-border/40 text-muted-foreground transition-all hover:bg-[#6ffbbe]/10 hover:border-[#006c49]/30 hover:text-[#003527] dark:hover:text-[#6ffbbe]">
                                <span className="sr-only">Twitter</span>
                                <Twitter className="h-[18px] w-[18px]" />
                            </a>
                            <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest border border-border/40 text-muted-foreground transition-all hover:bg-[#6ffbbe]/10 hover:border-[#006c49]/30 hover:text-[#003527] dark:hover:text-[#6ffbbe]">
                                <span className="sr-only">Facebook</span>
                                <Facebook className="h-[18px] w-[18px]" />
                            </a>
                            <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest border border-border/40 text-muted-foreground transition-all hover:bg-[#6ffbbe]/10 hover:border-[#006c49]/30 hover:text-[#003527] dark:hover:text-[#6ffbbe]">
                                <span className="sr-only">Instagram</span>
                                <Instagram className="h-[18px] w-[18px]" />
                            </a>
                            <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest border border-border/40 text-muted-foreground transition-all hover:bg-[#6ffbbe]/10 hover:border-[#006c49]/30 hover:text-[#003527] dark:hover:text-[#6ffbbe]">
                                <span className="sr-only">LinkedIn</span>
                                <Linkedin className="h-[18px] w-[18px]" />
                            </a>
                        </div>
                    </motion.div>

                    {/* Navigation Columns */}
                    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-3">
                        <motion.div variants={itemVariants}>
                            <h3 className="mb-6 text-sm font-semibold text-foreground">Product</h3>
                            <ul className="flex flex-col gap-4">
                                {footerLinks.product.map((link) => (
                                    <li key={link.name}>
                                        <Link href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#006c49] dark:hover:text-[#6ffbbe]">
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <h3 className="mb-6 text-sm font-semibold text-foreground">Solutions</h3>
                            <ul className="flex flex-col gap-4">
                                {footerLinks.solutions.map((link) => (
                                    <li key={link.name}>
                                        <Link href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#006c49] dark:hover:text-[#6ffbbe]">
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <h3 className="mb-6 text-sm font-semibold text-foreground">Company</h3>
                            <ul className="flex flex-col gap-4">
                                {footerLinks.company.map((link) => (
                                    <li key={link.name}>
                                        <Link href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#006c49] dark:hover:text-[#6ffbbe]">
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <h3 className="mb-6 text-sm font-semibold text-foreground">Legal</h3>
                            <ul className="flex flex-col gap-4">
                                {footerLinks.legal.map((link) => (
                                    <li key={link.name}>
                                        <Link href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-[#006c49] dark:hover:text-[#6ffbbe]">
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Bottom Bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row"
                >
                    <p className="text-sm font-medium text-muted-foreground">
                        © {new Date().getFullYear()} VentraPOS. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <span>VentraPOS was built by</span>
                        <a
                            href="#"
                            className="font-bold text-foreground transition-colors hover:text-[#006c49] dark:hover:text-[#6ffbbe]"
                        >
                            Let's Code
                        </a>
                    </div>
                </motion.div>

            </div>
        </footer>
    );
}
