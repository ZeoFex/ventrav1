import { env } from "../config/env";

interface SendOtpSmsProps {
  to: string;
  code: string;
}

function normalizeGhanaPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, "");
  if (digits.startsWith("+233")) return digits;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  return digits;
}

export async function sendOtpSms({ to, code }: SendOtpSmsProps) {
  if (!env.AGOO_API_KEY) {
    console.warn("[SMS Service] AGOO_API_KEY not configured — SMS skipped");
    return { success: false, error: "SMS not configured" };
  }

  const phone = normalizeGhanaPhone(to);

  try {
    const res = await fetch("https://api.agoosms.app/v1/sms/send", {
      method: "POST",
      headers: {
        "X-API-Key": env.AGOO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phone,
        message: `Your VentraPOS verification code is: ${code}. Valid for 10 minutes. Do not share this code.`,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[SMS Service Error]:", error);
      return { success: false, error };
    }

    const data = await res.json().catch(() => ({}));
    console.log(`✅ [SMS Service] OTP sent to ${phone}`);
    return { success: true, data };
  } catch (error) {
    console.error("[SMS Service catch]:", error);
    return { success: false, error };
  }
}
