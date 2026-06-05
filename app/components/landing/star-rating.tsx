"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
    value: number;
    max?: number;
    size?: "sm" | "md";
    interactive?: boolean;
    onChange?: (value: number) => void;
    className?: string;
};

export function StarRating({
    value,
    max = 5,
    size = "md",
    interactive = false,
    onChange,
    className,
}: StarRatingProps) {
    const iconSize = size === "sm" ? "size-4" : "size-5";

    return (
        <div
            className={cn("inline-flex items-center gap-0.5", className)}
            role={interactive ? "radiogroup" : "img"}
            aria-label={interactive ? "Rating" : `${value} out of ${max} stars`}
        >
            {Array.from({ length: max }, (_, i) => {
                const starValue = i + 1;
                const filled = starValue <= value;

                if (interactive) {
                    return (
                        <button
                            key={starValue}
                            type="button"
                            role="radio"
                            aria-checked={value === starValue}
                            aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
                            onClick={() => onChange?.(starValue)}
                            className="rounded p-0.5 transition-colors hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95d3ba]/50"
                        >
                            <Star
                                className={cn(
                                    iconSize,
                                    filled
                                        ? "fill-[#006c49] text-[#006c49] dark:fill-[#6ffbbe] dark:text-[#6ffbbe]"
                                        : "text-muted-foreground/40",
                                )}
                            />
                        </button>
                    );
                }

                return (
                    <Star
                        key={starValue}
                        className={cn(
                            iconSize,
                            filled
                                ? "fill-[#006c49] text-[#006c49] dark:fill-[#6ffbbe] dark:text-[#6ffbbe]"
                                : "text-muted-foreground/30",
                        )}
                        aria-hidden
                    />
                );
            })}
        </div>
    );
}
