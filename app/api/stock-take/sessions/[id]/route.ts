import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import {
    getStockTakeSession,
    saveStockTakeLines,
    completeStockTakeSession,
} from "@/server/stock-take/stock-take-service";
import { z } from "zod";

const patchSchema = z.discriminatedUnion("intent", [
    z.object({
        intent: z.literal("save-lines"),
        lines: z.array(
            z.object({
                productId: z.string().uuid(),
                countedQty: z.number().int().min(0),
            }),
        ),
    }),
    z.object({
        intent: z.literal("complete"),
    }),
]);

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { id } = await params;
        const detail = await getStockTakeSession(payload.bid, id);
        if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(detail);
    } catch (e) {
        console.error("GET /api/stock-take/sessions/[id]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { id } = await params;
        const json = await req.json();
        const parsed = patchSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
        }

        if (parsed.data.intent === "save-lines") {
            const ok = await saveStockTakeLines(payload.bid, id, parsed.data.lines);
            if (!ok) return NextResponse.json({ error: "Cannot update session" }, { status: 400 });
            const detail = await getStockTakeSession(payload.bid, id);
            return NextResponse.json(detail);
        }

        const result = await completeStockTakeSession(payload.bid, id);
        if (!result.ok) {
            const code =
                result.error === "NOT_FOUND"
                    ? 404
                    : result.error === "NO_LINES"
                      ? 400
                      : 400;
            return NextResponse.json({ error: result.error }, { status: code });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("PATCH /api/stock-take/sessions/[id]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
