import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gatePlatform, parsePagination } from "@/server/catalog/platform-route-utils";
import {
    listPlatformNotifications,
    markPlatformNotificationsRead,
} from "@/server/platform/platform-notification-service";

export const dynamic = "force-dynamic";

const patchBody = z
    .object({
        ids: z.array(z.string().uuid()).optional(),
        markAllRead: z.boolean().optional(),
    })
    .refine((o) => o.markAllRead === true || (o.ids && o.ids.length > 0), {
        message: "Provide ids or markAllRead: true",
    });

/** GET — platform admin notification feed. */
export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const { limit, offset } = parsePagination(searchParams);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const result = await listPlatformNotifications({ limit, offset, unreadOnly });
    return NextResponse.json(result);
}

/** PATCH — mark notifications read. */
export async function PATCH(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = patchBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid body", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const result = await markPlatformNotificationsRead(
        parsed.data.markAllRead ? undefined : parsed.data.ids
    );
    return NextResponse.json(result);
}
