import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { addCustomerOrderPayment } from "@/server/customer-orders/customer-order-service";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const { id: orderId } = await params;
        const body = await req.json();
        const paymentLines = body.paymentLines as
            | { paymentMethod: string; amountGhs: number }[]
            | undefined;
        if (!Array.isArray(paymentLines) || paymentLines.length === 0) {
            return NextResponse.json({ error: "paymentLines required" }, { status: 400 });
        }

        const summary = await addCustomerOrderPayment(
            payload.bid,
            branchId,
            orderId,
            paymentLines,
        );
        return NextResponse.json({ success: true, ...summary });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Payment failed";
        const client =
            msg.includes("open") ||
            msg.includes("exceeds") ||
            msg.includes("positive") ||
            msg.includes("not found");
        console.error("POST /api/customer-orders/.../payments failed:", error);
        return NextResponse.json({ error: msg }, { status: client ? 400 : 500 });
    }
}
