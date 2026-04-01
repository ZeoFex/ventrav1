import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { signup, AuthError } from "@/server/auth/auth-service";

// Mock the business logic service
vi.mock("@/server/auth/auth-service", () => ({
    signup: vi.fn(),
    AuthError: class AuthError extends Error {
        code: string;
        constructor(code: string, message: string) {
            super(message);
            this.code = code;
        }
    },
}));

describe("POST /api/auth/signup endpoint", () => {
    const createReq = (body: object) =>
        new NextRequest("http://localhost:3000/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

    const validPayload = {
        businessName: "FreshMart",
        fullName: "John Doe",
        email: "john@freshmart.local",
        password: "Password123!",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("NODE_ENV", "test");
    });

    it("should return 400 for empty payload", async () => {
        const req = createReq({});
        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.error).toBe("Validation failed");
        expect(data.details.email).toBeDefined();
        expect(data.details.password).toBeDefined();
        expect(data.details.businessName).toBeDefined();
    });

    it("should enforce strong password rules in Zod", async () => {
        const payloads = [
            { ...validPayload, password: "short" },           // length
            { ...validPayload, password: "password123!" },    // no uppercase
            { ...validPayload, password: "PASSWORD123!" },    // no lowercase
            { ...validPayload, password: "Password!" },       // no number
            { ...validPayload, password: "Password123" },     // no special char
        ];

        for (const payload of payloads) {
            const req = createReq(payload);
            const res = await POST(req);
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.details.password).toBeDefined();
        }
    });

    it("should return 201 and call signup service on valid payload", async () => {
        vi.mocked(signup).mockResolvedValue({
            userId: "test-user-id",
            businessId: "test-business-id",
            email: validPayload.email,
            otpCode: "123456",
        });

        const req = createReq(validPayload);
        const res = await POST(req);

        expect(signup).toHaveBeenCalledWith(validPayload);
        expect(res.status).toBe(201);

        const data = await res.json();
        expect(data.message).toMatch(/Account created/);
        expect(data.email).toBe(validPayload.email);
    });

    it("should map DUPLICATE_EMAIL error to 409 status code", async () => {
        vi.mocked(signup).mockRejectedValue(
            new AuthError("DUPLICATE_EMAIL", "Email exists")
        );

        const req = createReq(validPayload);
        const res = await POST(req);

        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.code).toBe("DUPLICATE_EMAIL");
        expect(data.error).toBe("Email exists");
    });

    it("should handle unexpected errors robustly", async () => {
        vi.mocked(signup).mockRejectedValue(new Error("DB Connection Interrupted"));

        const req = createReq(validPayload);
        const res = await POST(req);

        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe("Something went wrong. Please try again.");
        // Internal generic message prevents leaking DB connection errors to clients.
    });
});
