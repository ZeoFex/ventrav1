import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getCustomers, createCustomer } from "@/server/customers/customer-service";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const data = await getCustomers(payload.bid);

        return NextResponse.json(data);
    } catch (error) {
        console.error("GET /api/customers failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
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
