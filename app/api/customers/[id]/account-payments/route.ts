import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { recordCustomerAccountPayment } from "@/server/customers/customer-account-service";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id: customerId } = await params;
        const branchId = await getActiveBranchIdFromContext();
        const body = await req.json();

        const amountGhs = Number(body.amountGhs);
        const paymentMethod =
            typeof body.paymentMethod === "string" && body.paymentMethod.trim()
                ? body.paymentMethod.trim().slice(0, 30)
                : "cash";
        const note = typeof body.note === "string" ? body.note.slice(0, 500) : undefined;

        if (!Number.isFinite(amountGhs) || amountGhs <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        await recordCustomerAccountPayment(payload.bid, customerId, {
            amountGhs,
            paymentMethod,
            note,
            branchId,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Payment failed";
        const isClient =
            msg.includes("exceeds") ||
            msg.includes("positive") ||
            msg.includes("not found");
        console.error("POST /api/customers/.../account-payments failed:", error);
        return NextResponse.json({ error: msg }, { status: isClient ? 400 : 500 });
    }
}
