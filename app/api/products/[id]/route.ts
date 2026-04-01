import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { db } from "@/server/db";
import { products, productTags } from "@/server/db/schema/products";
import { eq, and } from "drizzle-orm";
import { COOKIE_NAMES } from "@/server/config/auth-config";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);

        const data = await db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.businessId, payload.bid)),
            with: {
                // To fetch tags, we'd need to define relations in drizzle.
                // For now, let's just fetch them manually if needed or update schema.
            }
        });

        if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Manual tag fetch for now
        const tags = await db
            .select({ tagId: productTags.tagId })
            .from(productTags)
            .where(eq(productTags.productId, id));

        return NextResponse.json({
            ...data,
            tagIds: tags.map(t => t.tagId)
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
