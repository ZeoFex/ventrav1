"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ReviewCard, type ReviewCardData } from "./review-card";

/** Pixels moved per second — keeps scroll speed consistent regardless of review count. */
const MARQUEE_SPEED_PX_PER_SEC = 48;
const CARD_CLASS = "reviews-carousel-card w-[min(85vw,300px)] shrink-0 sm:w-[320px] lg:w-[340px]";

type ReviewsCarouselProps = {
    reviews: ReviewCardData[];
    myReviewIds: Set<string>;
    onEditReview: (review: ReviewCardData) => void;
};

export function ReviewsCarousel({
    reviews,
    myReviewIds,
    onEditReview,
}: ReviewsCarouselProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [durationSec, setDurationSec] = useState(40);
    const [isInView, setIsInView] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    const useMarquee = reviews.length > 1 && !prefersReducedMotion;

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const observer = new IntersectionObserver(
            ([entry]) => setIsInView(entry?.isIntersecting ?? false),
            { threshold: 0.15, rootMargin: "40px 0px" },
        );

        observer.observe(viewport);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!useMarquee) return;

        const track = trackRef.current;
        if (!track) return;

        const syncDuration = () => {
            const loopWidth = track.scrollWidth / 2;
            if (loopWidth > 0) {
                setDurationSec(
                    Math.min(Math.max(loopWidth / MARQUEE_SPEED_PX_PER_SEC, 28), 120),
                );
            }
        };

        syncDuration();

        const resizeObserver = new ResizeObserver(syncDuration);
        resizeObserver.observe(track);

        return () => resizeObserver.disconnect();
    }, [reviews, useMarquee]);

    const renderCard = (review: ReviewCardData, suffix: string) => {
        const isOwn = myReviewIds.has(review.id);

        return (
            <div key={`${review.id}${suffix}`} className={CARD_CLASS}>
                <ReviewCard
                    review={review}
                    isOwn={isOwn}
                    onEdit={isOwn ? () => onEditReview(review) : undefined}
                />
            </div>
        );
    };

    if (reviews.length === 1) {
        const review = reviews[0]!;
        const isOwn = myReviewIds.has(review.id);

        return (
            <div className="mx-auto max-w-md px-2">
                <ReviewCard
                    review={review}
                    isOwn={isOwn}
                    onEdit={isOwn ? () => onEditReview(review) : undefined}
                    animateIn
                />
            </div>
        );
    }

    return (
        <div ref={viewportRef} className="reviews-carousel-bleed">
            <div
                className={`reviews-marquee overflow-hidden px-4 pb-3 pt-1 sm:px-8 ${
                    prefersReducedMotion ? "reviews-marquee--manual" : ""
                }`}
                aria-label="Customer reviews carousel"
            >
                <div
                    ref={trackRef}
                    className={`reviews-marquee-track flex w-max items-stretch gap-4 sm:gap-5 ${
                        useMarquee && !isInView ? "reviews-marquee-track--paused" : ""
                    }`}
                    style={
                        useMarquee
                            ? ({
                                  "--reviews-marquee-duration": `${durationSec}s`,
                              } as React.CSSProperties)
                            : undefined
                    }
                >
                    {reviews.map((review) => renderCard(review, "-a"))}
                    {useMarquee && reviews.map((review) => renderCard(review, "-b"))}
                </div>
            </div>
        </div>
    );
}

export function ReviewsCarouselSkeleton() {
    return (
        <div className="reviews-carousel-bleed">
            <div className="flex gap-4 overflow-hidden px-4 sm:gap-5 sm:px-8">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className={`${CARD_CLASS} h-56 animate-pulse rounded-2xl border border-border/40 bg-muted/30`}
                    />
                ))}
            </div>
        </div>
    );
}
