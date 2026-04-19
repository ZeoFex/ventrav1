import { SignJWT, jwtVerify } from "jose";

export type ResumePayload = {
  pendingId: string;
  businessId: string;
  userId: string;
  kind: "export_sales_csv";
};

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export async function signResumeToken(payload: ResumePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .setIssuer("ventrapos-copilot")
    .sign(secret());
}

export async function verifyResumeToken(token: string): Promise<ResumePayload> {
  const { payload } = await jwtVerify(token, secret(), {
    issuer: "ventrapos-copilot",
  });
  const p = payload as Record<string, unknown>;
  if (
    typeof p.pendingId !== "string" ||
    typeof p.businessId !== "string" ||
    typeof p.userId !== "string" ||
    p.kind !== "export_sales_csv"
  ) {
    throw new Error("Invalid resume token payload");
  }
  return {
    pendingId: p.pendingId,
    businessId: p.businessId,
    userId: p.userId,
    kind: "export_sales_csv",
  };
}
