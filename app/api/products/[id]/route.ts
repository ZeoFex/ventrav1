import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { products, productTags, productVariations } from "@/server/db/schema/products";
import { eq, and } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;

        const data = await db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.businessId, payload.bid)),
            with: {
                // To fetch tags, we'd need to define relations in drizzle.
                // For now, let's just fetch them manually if needed or update schema.
            }
        });

        if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Manual tag fetch for now
        const [tags, variations] = await Promise.all([
            db.select({ tagId: productTags.tagId }).from(productTags).where(eq(productTags.productId, id)),
            db.select().from(productVariations).where(eq(productVariations.productId, id))
        ]);

        return NextResponse.json({
            ...data,
            tagIds: tags.map(t => t.tagId),
            variations: variations
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
