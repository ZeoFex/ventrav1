import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { COOKIE_NAMES } from "@/server/config/auth-config";

export async function POST(req: NextRequest) {
    // Create a response that redirects back to login or landing
    // Note: For client-side logout calls, you might want to return JSON instead,
    // but a redirect is fine if the client handles the navigation.
    const response = NextResponse.json({ success: true });

    // Clear authentication cookies
    response.cookies.delete(COOKIE_NAMES.ACCESS);
    response.cookies.delete(COOKIE_NAMES.REFRESH);

    return response;
}
