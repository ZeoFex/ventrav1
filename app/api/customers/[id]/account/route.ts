import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getCustomerById } from "@/server/customers/customer-service";
import { listCustomerAccountEntries } from "@/server/customers/customer-account-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;
        const customer = await getCustomerById(payload.bid, id);
        if (!customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        const entries = await listCustomerAccountEntries(payload.bid, id, 40);
        return NextResponse.json({ customer, entries });
    } catch (error) {
        console.error("GET /api/customers/.../account failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
