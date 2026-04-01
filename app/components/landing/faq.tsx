"use client";

import { Minus, Plus } from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

const faqs = [
    {
        question: "What is VentraPOS?",
        answer: "VentraPOS is a cloud-based POS (Point of Sale) dashboard app designed to help businesses efficiently manage sales, inventory, customers, and financial reports in real-time. It streamlines business operations by providing a centralized platform for all POS-related activities.",
    },
    {
        question: "How does VentraPOS work?",
        answer: "VentraPOS works by connecting your sales terminals, inventory database, and management dashboards through our secure cloud infrastructure. This ensures that every transaction is instantly synced across all your store locations and devices.",
    },
    {
        question: "What are the main features of VentraPOS?",
        answer: "Key features include real-time inventory tracking, staff performance monitoring, secure employee login, detailed financial analytics, multi-location support, and seamless payment processing.",
    },
    {
        question: "Is VentraPOS right for my business?",
        answer: "Whether you run a single retail shop or a growing chain of stores, VentraPOS scales to meet your needs. Our flexible architecture and customizable modules ensure it fits perfectly into any retail workflow.",
    },
];

export function LandingFaq() {
    const [openIndex, setOpenIndex] = useState<number>(0);

    const toggleFaq = (index: number) => {
        setOpenIndex((prev) => (prev === index ? -1 : index));
    };

    return (
        <section className="relative overflow-hidden bg-background py-16 lg:py-24 text-foreground">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">

                    {/* Left Column: Heading & CTA */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="lg:col-span-5 flex flex-col"
                    >
                        <h2 className="mb-6 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
                            Frequently Asked<br className="hidden lg:block" /> Questions
                        </h2>

                        <p className="mb-10 text-lg leading-relaxed text-muted-foreground w-full max-w-md">
                            Have a question? Find answers to frequently asked questions
                            about VentraPOS. If you still need assistance, our team is ready to
                            help you.
                        </p>

                        <div className="flex items-center justify-between rounded-2xl bg-surface-elevated border border-border/40 p-5 shadow-sm max-w-md">
                            <span className="text-[15px] font-medium text-foreground">
                                Have another questions?
                            </span>
                            <Link
                                href="/contact"
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-6 text-[14px] font-medium text-white shadow-md transition-[filter] hover:brightness-110"
                            >
                                Ask Question
                            </Link>
                        </div>
                    </motion.div>

                    {/* Right Column: Accordion */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        {faqs.map((faq, idx) => {
                            const isOpen = openIndex === idx;

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
                                    className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${isOpen
                                        ? "border-border/60 bg-surface-elevated/50 shadow-sm"
                                        : "border-border/30 bg-surface-container-lowest hover:border-border/50 hover:bg-surface-elevated/30"
                                        }`}
                                >
                                    <button
                                        onClick={() => toggleFaq(idx)}
                                        className="flex w-full items-center justify-between p-6 text-left outline-none"
                                        aria-expanded={isOpen}
                                    >
                                        <span className={`text-base font-semibold tracking-tight transition-colors ${isOpen ? "text-foreground" : "text-muted-foreground"}`}>
                                            {faq.question}
                                        </span>
                                        <div className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${isOpen ? "bg-secondary/10 text-secondary" : "text-muted-foreground/50"}`}>
                                            {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                                                className="overflow-hidden"
                                            >
                                                <p className="px-6 pb-6 text-[15px] leading-relaxed text-muted-foreground">
                                                    {faq.answer}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </section>
    );
}
