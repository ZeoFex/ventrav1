import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getCustomers, createCustomer } from "@/server/customers/customer-service";

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const data = await getCustomers(payload.bid);

        return NextResponse.json(data);
    } catch (error) {
        console.error("GET /api/customers failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const body = await req.json();

        const newCustomer = await createCustomer(payload.bid, {
            name: body.name,
            phone: body.phone,
            email: body.email,
            status: body.status || "active",
        });

        return NextResponse.json(newCustomer, { status: 201 });
    } catch (error) {
        console.error("POST /api/customers failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
