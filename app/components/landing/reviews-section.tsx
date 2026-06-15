"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ReviewForm, type EditableReview } from "./review-form";
import { ReviewsCarousel, ReviewsCarouselSkeleton } from "./reviews-carousel";
import type { ReviewCardData } from "./review-card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    getMyReviewEditToken,
    getMyReviewIds,
} from "@/app/lib/reviews/my-reviews-storage";
import type { ReviewPage } from "@/server/db/schema/reviews";

type ReviewsSectionProps = {
    page?: ReviewPage;
    title?: string;
    description?: string;
    showForm?: boolean;
};

export function ReviewsSection({
    page,
    title = "What Businesses Are Saying",
    description = "Real feedback from shop owners and managers using VentraPOS to run their operations.",
    showForm = true,
}: ReviewsSectionProps) {
    const [reviews, setReviews] = useState<ReviewCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [myReviewIds, setMyReviewIds] = useState<Set<string>>(new Set());
    const [editingReview, setEditingReview] = useState<EditableReview | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const refreshMyReviews = useCallback(() => {
        setMyReviewIds(new Set(getMyReviewIds()));
    }, []);

    useEffect(() => {
        refreshMyReviews();
    }, [refreshMyReviews, refreshKey]);

    const loadReviews = useCallback(async (signal?: { cancelled: boolean }) => {
        try {
            const params = new URLSearchParams({ limit: "12" });
            if (page) params.set("page", page);

            const res = await fetch(`/api/reviews?${params.toString()}`, {
                cache: "no-store",
            });
            if (signal?.cancelled) return;

            if (res.ok) {
                const data = await res.json();
                setReviews(data);
            } else {
                setReviews([]);
            }
        } catch {
            if (!signal?.cancelled) setReviews([]);
        } finally {
            if (!signal?.cancelled) setIsLoading(false);
        }
    }, [page]);

    useEffect(() => {
        const signal = { cancelled: false };
        setIsLoading(true);
        void loadReviews(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadReviews, refreshKey]);

    const handleReviewClick = (review: ReviewCardData) => {
        const editToken = getMyReviewEditToken(review.id);
        if (!editToken) return;

        setEditingReview({
            id: review.id,
            editToken,
            name: review.name,
            role: review.role ?? "",
            content: review.content,
            rating: review.rating,
        });
        setEditDialogOpen(true);
    };

    const handleEditComplete = () => {
        setRefreshKey((k) => k + 1);
        setEditDialogOpen(false);
        setEditingReview(null);
    };

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
                        <ReviewsCarouselSkeleton />
                    ) : reviews.length > 0 ? (
                        <ReviewsCarousel
                            reviews={reviews}
                            myReviewIds={myReviewIds}
                            onEditReview={handleReviewClick}
                        />
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

            <Dialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                    setEditDialogOpen(open);
                    if (!open) setEditingReview(null);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit your review</DialogTitle>
                        <DialogDescription>
                            Update your rating or feedback. Changes are published immediately.
                        </DialogDescription>
                    </DialogHeader>
                    {editingReview && (
                        <ReviewForm
                            editingReview={editingReview}
                            variant="plain"
                            onSubmitted={handleEditComplete}
                            onCancelEdit={() => {
                                setEditDialogOpen(false);
                                setEditingReview(null);
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}
