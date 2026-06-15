"use client";

import { useEffect, useState } from "react";
import { Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "./star-rating";
import { saveMyReviewEditToken } from "@/app/lib/reviews/my-reviews-storage";
import type { ReviewPage } from "@/server/db/schema/reviews";

export type EditableReview = {
    id: string;
    editToken: string;
    name: string;
    role: string;
    content: string;
    rating: number;
};

type ReviewFormProps = {
    page?: ReviewPage;
    onSubmitted?: () => void;
    editingReview?: EditableReview | null;
    onCancelEdit?: () => void;
    variant?: "card" | "plain";
};

const inputClassName =
    "h-12 w-full rounded-lg bg-background px-4 text-sm outline outline-1 outline-border/30 focus:outline-[#95d3ba] focus:ring-2 focus:ring-[#95d3ba]/30 transition";

export function ReviewForm({
    page,
    onSubmitted,
    editingReview,
    onCancelEdit,
    variant = "card",
}: ReviewFormProps) {
    const isEditing = Boolean(editingReview);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rating, setRating] = useState(editingReview?.rating ?? 0);
    const [formData, setFormData] = useState({
        name: editingReview?.name ?? "",
        role: editingReview?.role ?? "",
        content: editingReview?.content ?? "",
    });

    useEffect(() => {
        if (!editingReview) return;
        setRating(editingReview.rating);
        setFormData({
            name: editingReview.name,
            role: editingReview.role,
            content: editingReview.content,
        });
    }, [editingReview]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating < 1) {
            toast.error("Please select a star rating.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                role: formData.role || null,
                rating,
            };

            const res = await fetch(
                isEditing ? `/api/reviews/${editingReview!.id}` : "/api/reviews",
                {
                    method: isEditing ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                        isEditing
                            ? { ...payload, editToken: editingReview!.editToken }
                            : { ...payload, page: page ?? null },
                    ),
                },
            );

            const result = await res.json();

            if (!res.ok) {
                const fieldErrors = result.details?.fieldErrors as
                    | Record<string, string[] | undefined>
                    | undefined;
                const firstFieldError = fieldErrors
                    ? Object.values(fieldErrors).flat().find(Boolean)
                    : undefined;
                toast.error(
                    firstFieldError ??
                        result.error ??
                        (res.status === 503
                            ? "Reviews are not set up yet. Ask your administrator to run db:push or db:migrate."
                            : isEditing
                              ? "Failed to update review."
                              : "Failed to submit review."),
                );
                return;
            }

            if (!isEditing && result.editToken && result.review?.id) {
                saveMyReviewEditToken(result.review.id, result.editToken);
            }

            toast.success(result.message);
            if (!isEditing) {
                setFormData({ name: "", role: "", content: "" });
                setRating(0);
            }
            onSubmitted?.();
            if (isEditing) onCancelEdit?.();
        } catch {
            toast.error("Something went wrong. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const form = (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                    Your rating
                </label>
                <StarRating
                    value={rating}
                    interactive
                    onChange={setRating}
                    size="md"
                />
            </div>

            <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className={inputClassName}
            />

            <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="Role or business (optional)"
                className={inputClassName}
            />

            <textarea
                name="content"
                required
                rows={4}
                value={formData.content}
                onChange={handleChange}
                placeholder="Write your review..."
                className="rounded-lg bg-background px-4 py-3 text-sm outline outline-1 outline-border/30 focus:outline-[#95d3ba] focus:ring-2 focus:ring-[#95d3ba]/30 transition"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-8 text-[15px] font-medium text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting
                        ? isEditing
                            ? "Saving..."
                            : "Submitting..."
                        : isEditing
                          ? "Save Changes"
                          : "Submit Review"}
                    {!isSubmitting && (isEditing ? <Pencil className="size-4" /> : <Send className="size-4" />)}
                </button>
                {isEditing && onCancelEdit && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-border/50 px-6 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );

    if (variant === "plain") {
        return form;
    }

    return (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-6 backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.02] sm:p-8">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground sm:text-2xl">
                {isEditing ? "Edit Your Review" : "Share Your Experience"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
                {isEditing
                    ? "Update your feedback below. Changes appear right away."
                    : "Tell us how VentraPOS has helped your business. Your review will appear right away."}
            </p>
            {form}
        </div>
    );
}
