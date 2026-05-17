import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { createSupplier, listSuppliers } from "@/server/suppliers/supplier-service";
import { z } from "zod";

const createSchema = z.object({
    type: z.enum(["individual", "business"]),
    name: z.string().min(1),
    truckNumber: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal("")).nullable(),
    phones: z.array(z.string()).default([]),
});

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const rows = await listSuppliers(payload.bid);
        return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        console.error("GET /api/suppliers", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const branchId = await getActiveBranchIdFromContext();
        const json = await req.json();
        const parsed = createSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }
        const body = parsed.data;
        const row = await createSupplier({
            businessId: payload.bid,
            branchId: branchId === "all" ? null : branchId,
            type: body.type,
            name: body.name,
            truckNumber: body.truckNumber ?? null,
            email: body.email || null,
            phones: body.phones,
        });
        return NextResponse.json(row, { status: 201 });
    } catch (e) {
        console.error("POST /api/suppliers", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
