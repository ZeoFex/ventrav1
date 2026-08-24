import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getCustomerById, updateCustomer } from "@/server/customers/customer-service";
import { logShopActivity } from "@/server/platform/shop-activity-log";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
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

        return NextResponse.json(customer);
    } catch (error) {
        console.error(`GET /api/customers/${(await params).id} failed:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;
        const body = await req.json();

        const updated = await updateCustomer(payload.bid, id, {
            name: body.name,
            phone: body.phone,
            email: body.email,
            status: body.status,
        });

        if (!updated) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        void logShopActivity({
            req,
            userId: payload.sub,
            businessId: payload.bid,
            action: "shop.customer.updated",
            resource: "customer",
            resourceId: updated.id,
            detail: [updated.name, updated.phone].filter(Boolean).join(" · "),
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error(`PATCH /api/customers/${(await params).id} failed:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
