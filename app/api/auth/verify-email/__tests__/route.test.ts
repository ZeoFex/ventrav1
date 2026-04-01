import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { verifyEmail, AuthError } from "@/server/auth/auth-service";
import { signAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";

vi.mock("@/server/auth/auth-service", () => ({
    verifyEmail: vi.fn(),
    AuthError: class AuthError extends Error {
        code: string;
        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
}));

vi.mock("@/server/auth/token-service", () => ({
    signAccessToken: vi.fn(),
}));

describe("POST /api/auth/verify-email endpoint", () => {
    const createReq = (body: object) =>
        new NextRequest("http://localhost:3000/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

    const validPayload = {
        email: "john@freshmart.local",
        code: "123456",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should block empty or invalid payload", async () => {
        const invalidPayloads = [
            {},
            { email: "not-an-email", code: "123456" },
            { email: "a@b.c", code: "12345" }, // Too short
            { email: "a@b.c", code: "12e456" }, // Not numbers
        ];

        for (const payload of invalidPayloads) {
            const res = await POST(createReq(payload));
            expect(res.status).toBe(400);
        }
    });

    it("should verify OTP, sign JWT, and set cookie", async () => {
        const mockUserCtx = {
            userId: "u-123",
            businessId: "b-123",
            firstName: "John",
            email: "john@freshmart.local",
            role: "owner",
            permissions: [],
            plan: "starter",
        };

        vi.mocked(verifyEmail).mockResolvedValue(mockUserCtx);
        vi.mocked(signAccessToken).mockResolvedValue("mock.jwt.string");

        const res = await POST(createReq(validPayload));
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.message).toBe("Email verified successfully");
        expect(data.user).toMatchObject({
            id: "u-123",
            businessId: "b-123",
            firstName: "John",
            role: "owner",
            plan: "starter",
        });

        expect(verifyEmail).toHaveBeenCalledWith(validPayload);
        expect(signAccessToken).toHaveBeenCalledWith(mockUserCtx);

        // Verify Set-Cookie header contains standard security flags
        const cookieHeader = res.headers.get("Set-Cookie");
        expect(cookieHeader).toContain(COOKIE_NAMES.ACCESS);
        expect(cookieHeader).toContain("mock.jwt.string");
        expect(cookieHeader).toContain("HttpOnly");
        expect(cookieHeader).toContain("SameSite=Lax");
    });

    it("should return 400 when OTP is invalid (INVALID_OTP)", async () => {
        vi.mocked(verifyEmail).mockRejectedValue(
            new AuthError("INVALID_OTP", "Invalid or expired verification code")
        );

        const res = await POST(createReq(validPayload));
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.code).toBe("INVALID_OTP");
    });

    it("should return 429 when OTP attempts are exhausted", async () => {
        vi.mocked(verifyEmail).mockRejectedValue(
            new AuthError("OTP_EXHAUSTED", "Too many attempts.")
        );

        const res = await POST(createReq(validPayload));
        expect(res.status).toBe(429);
    });
});
