import { NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/server/config/auth-config";

export async function POST() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAMES.SHOPPER, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
    return response;
}
