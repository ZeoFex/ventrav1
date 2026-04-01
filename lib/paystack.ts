/**
 * Paystack server-side client for handling direct charges, OTPs, PINs, and verification.
 * 
 * NOTE: Ensure PAYSTACK_SECRET_KEY is set in your environment variables.
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const BASE_URL = "https://api.paystack.co";

interface BaseResponse {
  status: boolean;
  message: string;
}

interface ChargeResponse extends BaseResponse {
  data: {
    reference: string;
    status: string;
    display_text?: string;
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string;
    };
  };
}

interface VerifyResponse extends BaseResponse {
  data: {
    status: string;
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    metadata?: any;
    authorization?: any;
    customer?: any;
  };
}

async function paystackRequest<T>(endpoint: string, method: string = "GET", body?: any): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(`Paystack API error: ${response.statusText}`);
    }
    
    // Some Paystack errors (like failed MoMo charges) have the real message in data.message
    const errorMessage = errorData.data?.message || errorData.message || `Paystack API error: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json() as T;
}

/**
 * Initialize a Mobile Money charge.
 *
 * @param email The customer's email address
 * @param amount The amount in kobo/pesewas
 * @param mobileMoney Details for MoMo (phone, provider)
 * @param reference Optional custom reference string
 */
export async function chargeMomo(
  email: string,
  amount: number,
  mobileMoney: { phone: string; provider: "mtn" | "vod" | "tigo" },
  reference?: string
): Promise<ChargeResponse> {
  return paystackRequest<ChargeResponse>("/charge", "POST", {
    email,
    amount,
    mobile_money: mobileMoney,
    reference,
    currency: "GHS", // Assuming GHS for Ghana MoMo by default
  });
}

/**
 * Submit OTP for a pending charge that requires it.
 */
export async function submitOTP(otp: string, reference: string): Promise<ChargeResponse> {
  return paystackRequest<ChargeResponse>("/charge/submit_otp", "POST", {
    otp,
    reference,
  });
}

/**
 * Check pending charge/transaction. (Useful for MoMo pending flows).
 */
export async function checkPendingCharge(reference: string): Promise<ChargeResponse> {
  return paystackRequest<ChargeResponse>(`/charge/${reference}`, "GET");
}

/**
 * Verify a transaction.
 */
export async function verifyTransaction(reference: string): Promise<VerifyResponse> {
  return paystackRequest<VerifyResponse>(`/transaction/verify/${reference}`, "GET");
}
