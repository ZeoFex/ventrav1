import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getCustomerById, updateCustomer } from "@/server/customers/customer-service";

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

        return NextResponse.json(updated);
    } catch (error) {
        console.error(`PATCH /api/customers/${(await params).id} failed:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
