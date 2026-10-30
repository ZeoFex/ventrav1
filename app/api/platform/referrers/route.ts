import { and, isNotNull, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { gatePlatform } from "@/server/catalog/platform-route-utils";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";

export const dynamic = "force-dynamic";

type ReferrerShop = {
    id: string;
    name: string;
    region: string | null;
    city: string | null;
    plan: "starter" | "growth" | "pro";
};

export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const rows = await db
        .select({
            id: businesses.id,
            name: businesses.name,
            region: businesses.region,
            city: businesses.city,
            plan: businesses.plan,
            broughtByName: businesses.broughtByName,
        })
        .from(businesses)
        .where(
            and(
                isNotNull(businesses.broughtByName),
                sql`length(trim(${businesses.broughtByName})) > 0`,
            ),
        );

    const groups = new Map<
        string,
        { name: string; shops: ReferrerShop[] }
    >();

    for (const row of rows) {
        const display = row.broughtByName?.trim() ?? "";
        if (!display) continue;
        const key = display.toLowerCase();
        const current = groups.get(key) ?? { name: display, shops: [] };
        current.shops.push({
            id: row.id,
            name: row.name,
            region: row.region,
            city: row.city,
            plan: row.plan,
        });
        groups.set(key, current);
    }

    const people = [...groups.values()]
        .map((group) => ({
            name: group.name,
            shopCount: group.shops.length,
            shops: group.shops.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => b.shopCount - a.shopCount || a.name.localeCompare(b.name));

    return NextResponse.json({
        people,
        personCount: people.length,
        shopCount: rows.length,
    });
}
