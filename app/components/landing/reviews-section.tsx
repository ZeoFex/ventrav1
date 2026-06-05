"use client";

import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { motion } from "motion/react";
import { StarRating } from "./star-rating";
import { ReviewForm } from "./review-form";
import type { ReviewPage } from "@/server/db/schema/reviews";

type Review = {
    id: string;
    name: string;
    role: string | null;
    rating: number;
    content: string;
    page: string | null;
    createdAt: string;
};

type ReviewsSectionProps = {
    page?: ReviewPage;
    title?: string;
    description?: string;
    showForm?: boolean;
};

function formatReviewDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
}

export function ReviewsSection({
    page,
    title = "What Businesses Are Saying",
    description = "Real feedback from shop owners and managers using VentraPOS to run their operations.",
    showForm = true,
}: ReviewsSectionProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const params = new URLSearchParams({ limit: "12" });
                if (page) params.set("page", page);

                const res = await fetch(`/api/reviews?${params.toString()}`, {
                    cache: "no-store",
                });
                if (cancelled) return;

                if (res.ok) {
                    const data = await res.json();
                    setReviews(data);
                } else {
                    setReviews([]);
                }
            } catch {
                if (!cancelled) setReviews([]);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [page, refreshKey]);

    return (
        <section className="relative overflow-hidden border-t border-border/40 bg-background py-16 text-foreground lg:py-24">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#006c49_0%,transparent_45%)] opacity-[0.05] dark:opacity-15"
            />
            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto max-w-3xl text-center"
                >
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#006c49]/25 bg-[#003527]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006c49] dark:border-[#006c49]/20 dark:bg-[#003527]/30 dark:text-[#6ffbbe]">
                        <span
                            className="size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]"
                            aria-hidden
                        />
                        Customer Reviews
                    </div>
                    <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold leading-tight text-foreground">
                        {title}
                    </h2>
                    <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                        {description}
                    </p>
                </motion.div>

                <div className="mt-10 sm:mt-12">
                    {isLoading ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-48 animate-pulse rounded-2xl border border-border/40 bg-muted/30"
                                />
                            ))}
                        </div>
                    ) : reviews.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {reviews.map((review, idx) => (
                                <motion.article
                                    key={review.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-60px" }}
                                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                                    className="flex flex-col rounded-2xl border border-border/50 bg-surface-elevated p-6 shadow-sm transition-colors hover:border-[#006c49]/25 dark:hover:border-[#6ffbbe]/20"
                                >
                                    <Quote
                                        className="mb-3 size-5 text-[#006c49]/60 dark:text-[#6ffbbe]/60"
                                        aria-hidden
                                    />
                                    <p className="flex-1 text-[14px] leading-relaxed text-foreground sm:text-[15px]">
                                        &ldquo;{review.content}&rdquo;
                                    </p>
                                    <div className="mt-5 border-t border-border/40 pt-4">
                                        <StarRating value={review.rating} size="sm" />
                                        <p className="mt-2 text-sm font-semibold text-foreground">
                                            {review.name}
                                        </p>
                                        {review.role && (
                                            <p className="text-xs text-muted-foreground">
                                                {review.role}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-muted-foreground/70">
                                            {formatReviewDate(review.createdAt)}
                                        </p>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-6 py-12 text-center">
                            <p className="text-muted-foreground">
                                No reviews yet. Be the first to share your experience!
                            </p>
                        </div>
                    )}
                </div>

                {showForm && (
                    <div className="mt-12 max-w-2xl mx-auto">
                        <ReviewForm
                            page={page}
                            onSubmitted={() => setRefreshKey((k) => k + 1)}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}
