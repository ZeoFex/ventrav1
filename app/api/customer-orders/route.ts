import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import {
    getActiveBranchIdFromContext,
    getActiveBranchIdFromRequest,
} from "@/server/auth/get-branch-id";
import { cookies } from "next/headers";
import {
    createCustomerOrder,
    listCustomerOrdersForBranch,
    type CreateCustomerOrderInput,
} from "@/server/customer-orders/customer-order-service";

/**
 * GET /api/customer-orders?customerId=
 * Lists open customer orders for the active branch.
 */
export async function GET(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const cookieStore = await cookies();
        const branchId =
            getActiveBranchIdFromRequest(req, cookieStore) ??
            (await getActiveBranchIdFromContext());
        if (!branchId) {
            return NextResponse.json(
                { error: "Select a branch to view customer orders" },
                { status: 400 },
            );
        }
        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get("customerId")?.trim() || undefined;
        const includeCompleted =
            searchParams.get("includeCompleted") === "1" ||
            searchParams.get("includeCompleted") === "true";

        const rows = await listCustomerOrdersForBranch(payload.bid, branchId, {
            customerId,
            includeCompleted,
        });
        return NextResponse.json({ orders: rows });
    } catch (e) {
        console.error("GET /api/customer-orders failed:", e);
        return NextResponse.json({ error: "Failed to list orders" }, { status: 500 });
    }
}

/**
 * POST /api/customer-orders
 * Create layaway / pay-and-hold order with optional initial payment.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        if (!branchId) {
            return NextResponse.json(
                { error: "Select a branch to create a customer order" },
                { status: 400 },
            );
        }
        const body = (await req.json()) as CreateCustomerOrderInput & {
            lines?: CreateCustomerOrderInput["lines"];
        };

        if (!body.lines?.length) {
            return NextResponse.json({ error: "Order lines required" }, { status: 400 });
        }

        const result = await createCustomerOrder(
            payload.bid,
            branchId,
            payload.sub ?? null,
            {
                invoiceId: body.invoiceId,
                subtotalGhs: Number(body.subtotalGhs),
                taxGhs: Number(body.taxGhs),
                discountGhs: Number(body.discountGhs),
                totalGhs: Number(body.totalGhs),
                customerId: body.customerId,
                lines: body.lines.map((l) => ({
                    productId: l.productId,
                    variationId: l.variationId ?? null,
                    quantity: l.quantity,
                    productName: l.productName,
                    unitPriceGhs: Number(l.unitPriceGhs),
                    lineTotalGhs: Number(l.lineTotalGhs),
                })),
                paymentLines: body.paymentLines?.map((p) => ({
                    paymentMethod: p.paymentMethod,
                    amountGhs: Number(p.amountGhs),
                })),
            },
        );

        return NextResponse.json({
            success: true,
            orderId: result.orderId,
            invoiceId: result.invoiceId,
            amountPaidGhs: result.amountPaidGhs,
            balanceDueGhs: result.balanceDueGhs,
            totalGhs: result.totalGhs,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Create order failed";
        const client =
            msg.includes("required") ||
            msg.includes("not found") ||
            msg.includes("Insufficient") ||
            msg.includes("Invalid") ||
            msg.includes("positive") ||
            msg.includes("Customer");
        console.error("POST /api/customer-orders failed:", error);
        return NextResponse.json({ error: msg }, { status: client ? 400 : 500 });
    }
}
