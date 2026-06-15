"use client";

import { Pencil, Quote } from "lucide-react";
import { motion } from "motion/react";
import { StarRating } from "./star-rating";

export type ReviewCardData = {
    id: string;
    name: string;
    role: string | null;
    rating: number;
    content: string;
    createdAt: string;
};

type ReviewCardProps = {
    review: ReviewCardData;
    isOwn?: boolean;
    onEdit?: () => void;
    animateIn?: boolean;
    animationDelay?: number;
};

function formatReviewDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
}

export function ReviewCard({
    review,
    isOwn = false,
    onEdit,
    animateIn = false,
    animationDelay = 0,
}: ReviewCardProps) {
    const className = `flex h-full min-h-[220px] flex-col rounded-2xl border border-border/50 bg-surface-elevated p-6 shadow-sm transition-[border-color,box-shadow] duration-300 ${
        isOwn
            ? "cursor-pointer hover:border-[#006c49]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95d3ba]/50 dark:hover:border-[#6ffbbe]/30"
            : "hover:border-[#006c49]/25 dark:hover:border-[#6ffbbe]/20"
    }`;

    const content = (
        <>
            {isOwn && (
                <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#006c49]/20 bg-[#003527]/10 px-2.5 py-1 text-[11px] font-medium text-[#006c49] dark:border-[#6ffbbe]/20 dark:bg-[#003527]/30 dark:text-[#6ffbbe]">
                    <Pencil className="size-3" aria-hidden />
                    Your review · tap to edit
                </div>
            )}
            <Quote
                className="mb-3 size-5 text-[#006c49]/60 dark:text-[#6ffbbe]/60"
                aria-hidden
            />
            <p className="flex-1 text-[14px] leading-relaxed text-foreground sm:text-[15px]">
                &ldquo;{review.content}&rdquo;
            </p>
            <div className="mt-5 border-t border-border/40 pt-4">
                <StarRating value={review.rating} size="sm" />
                <p className="mt-2 text-sm font-semibold text-foreground">{review.name}</p>
                {review.role && (
                    <p className="text-xs text-muted-foreground">{review.role}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatReviewDate(review.createdAt)}
                </p>
            </div>
        </>
    );

    if (animateIn) {
        return (
            <motion.article
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: animationDelay }}
                onClick={isOwn ? onEdit : undefined}
                onKeyDown={
                    isOwn
                        ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onEdit?.();
                              }
                          }
                        : undefined
                }
                role={isOwn ? "button" : undefined}
                tabIndex={isOwn ? 0 : undefined}
                className={className}
            >
                {content}
            </motion.article>
        );
    }

    return (
        <article
            onClick={isOwn ? onEdit : undefined}
            onKeyDown={
                isOwn
                    ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onEdit?.();
                          }
                      }
                    : undefined
            }
            role={isOwn ? "button" : undefined}
            tabIndex={isOwn ? 0 : undefined}
            className={className}
        >
            {content}
        </article>
    );
}
