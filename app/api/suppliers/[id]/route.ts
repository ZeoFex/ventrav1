import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getSupplier, updateSupplier } from "@/server/suppliers/supplier-service";
import {
    getSupplierOutstandingGhs,
    listSupplyOrdersForSupplier,
} from "@/server/suppliers/supply-service";
import { z } from "zod";

const patchSchema = z.object({
    type: z.enum(["individual", "business"]).optional(),
    name: z.string().min(1).optional(),
    truckNumber: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal("")).nullable(),
    phones: z.array(z.string()).optional(),
});

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
        const [supplier, outstandingGhs, supplies] = await Promise.all([
            getSupplier(payload.bid, id),
            getSupplierOutstandingGhs(payload.bid, id),
            listSupplyOrdersForSupplier(payload.bid, id),
        ]);
        if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ supplier, outstandingGhs, supplies });
    } catch (e) {
        console.error("GET /api/suppliers/[id]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { id } = await params;
        const json = await req.json();
        const parsed = patchSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }
        const updated = await updateSupplier(payload.bid, id, parsed.data);
        if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(updated);
    } catch (e) {
        console.error("PATCH /api/suppliers/[id]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
