"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { motion } from "motion/react";

const ORDER_IMAGE_LIGHT = "/landing/order-light.png";
const ORDER_IMAGE_DARK = "/landing/order-pos.png";

export function LandingOrders() {
    return (
        <section className="relative overflow-hidden bg-background py-16 lg:py-24 text-foreground">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                    {/* Left Column: Text & CTA */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="flex flex-col justify-center order-2 lg:order-1"
                    >
                        {/* Badge */}
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-surface-elevated px-4 py-1.5 text-[13px] font-medium tracking-wide text-muted-foreground w-fit">
                            <span className="size-2 shrink-0 rounded-full bg-secondary" aria-hidden />
                            <span className="font-[family-name:var(--font-display)] uppercase tracking-wider text-xs text-foreground">
                                Manage Orders
                            </span>
                        </div>

                        {/* Heading */}
                        <h2 className="mb-6 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-[56px] lg:leading-[1.1]">
                            Efficiently Manage<br className="hidden sm:block" /> Your Orders
                        </h2>

                        {/* Description */}
                        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                            VentraPOS makes it easy for you to manage all orders from one place.
                            Improve customer satisfaction with a fast and efficient ordering
                            Process scaling with your business.
                        </p>

                        {/* CTA */}
                        <div>
                            <Link
                                href="/contact"
                                className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-8 text-[15px] font-medium text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)]"
                            >
                                Book your demo
                            </Link>
                        </div>
                    </motion.div>

                    {/* Right Column: Floating Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.7, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="relative flex justify-center lg:justify-end order-1 lg:order-2"
                    >
                        <div className="relative z-10 w-full max-w-lg">
                            {/* Floating Image Wrapper */}
                            <div className="relative w-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                                <Image
                                    src={ORDER_IMAGE_LIGHT}
                                    alt="VentraPOS Order Management Preview"
                                    width={720}
                                    height={540}
                                    className="h-auto w-full object-contain block dark:hidden"
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                />
                                <Image
                                    src={ORDER_IMAGE_DARK}
                                    alt="VentraPOS Order Management Preview"
                                    width={720}
                                    height={540}
                                    className="h-auto w-full object-contain hidden dark:block"
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                />
                            </div>

                            {/* Ambient glow matching the brand colors */}
                            <div
                                aria-hidden
                                className="absolute left-1/2 top-1/2 -z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(0,108,73,0.12)_0%,transparent_60%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(0,108,73,0.08)_0%,transparent_60%)]"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
