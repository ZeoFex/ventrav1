import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, can contain multiple "routes"
export const ourFileRouter = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    storeLogo: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async ({ req }) => {
            const token = req.cookies.get("__ventra_at")?.value;
            if (!token) throw new Error("Unauthorized");
            const { verifyAccessToken } = await import("@/server/auth/token-service");
            const payload = await verifyAccessToken(token);
            if (!payload.bid) throw new Error("No business associated");
            return { businessId: payload.bid };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            const { db } = await import("@/server/db");
            const { businesses } = await import("@/server/db/schema/businesses");
            const { eq } = await import("drizzle-orm");
            const { invalidateBusinessConfig } = await import("@/server/businesses/business-service");

            await db.update(businesses)
                .set({ logoUrl: file.url, updatedAt: new Date() })
                .where(eq(businesses.id, metadata.businessId));
            
            await invalidateBusinessConfig(metadata.businessId);
            
            console.log("Upload complete for logo:", file.url);
            return { url: file.url };
        }),
    productImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        .middleware(async ({ req }) => {
            return {};
        })
        .onUploadComplete(async ({ file }) => {
            console.log("Product Image uploaded:", file.url);
            return { url: file.url };
        }),
    userProfile: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
        .middleware(async ({ req }) => {
            const token = req.cookies.get("__ventra_at")?.value;
            if (!token) throw new Error("Unauthorized");
            const { verifyAccessToken } = await import("@/server/auth/token-service");
            const payload = await verifyAccessToken(token);
            return { userId: payload.sub };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            const { db } = await import("@/server/db");
            const { users } = await import("@/server/db/schema/users");
            const { eq } = await import("drizzle-orm");
            await db.update(users)
                .set({ avatarUrl: file.url, updatedAt: new Date() })
                .where(eq(users.id, metadata.userId));
            return { url: file.url };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
