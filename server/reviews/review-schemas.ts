import { z } from "zod";
import { REVIEW_PAGES } from "../db/schema/reviews";

export const reviewBodySchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    role: z.string().max(150).optional().nullable(),
    rating: z.coerce.number().int().min(1).max(5),
    content: z
        .string()
        .min(10, "Review must be at least 10 characters")
        .max(2000),
});

export const submitReviewSchema = reviewBodySchema.extend({
    page: z.enum(REVIEW_PAGES).optional().nullable(),
});

export const updateReviewSchema = reviewBodySchema.extend({
    editToken: z.string().min(1, "Edit token is required"),
});
