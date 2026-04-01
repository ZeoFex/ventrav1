import { NextRequest, NextResponse } from "next/server";
import { submitOTP } from "@/lib/paystack";
import { z } from "zod";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";

const otpSchema = z.object({
  otp: z.string().min(4),
  reference: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAMES.ACCESS)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = otpSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid OTP details" }, { status: 400 });
    }

    const paystackResult = await submitOTP(parsed.data.otp, parsed.data.reference);

    return NextResponse.json(paystackResult);
  } catch (error: any) {
    console.error("[Paystack OTP API Error]", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to submit OTP" },
      { status: 500 }
    );
  }
}
