import { NextResponse } from "next/server";
import type { LoginResult } from "./auth-service";
import { signAccessToken } from "./token-service";
import { ACCESS_TOKEN_TTL, COOKIE_NAMES } from "../config/auth-config";
import { env } from "../config/env";

export async function createAuthenticatedLoginResponse(
    result: LoginResult,
    fallbackEmail?: string
): Promise<NextResponse> {
    const accessToken = await signAccessToken({
        userId: result.userId,
        firstName: result.firstName,
        email: result.email || fallbackEmail || "",
        businessId: result.businessId,
        role: result.role,
        branchId: result.branchId,
        permissions: result.permissions,
        plan: result.plan,
    });

    const isProduction = process.env.NODE_ENV === "production";

    const bodyJson: {
        message: string;
        user: {
            id: string;
            businessId: string;
            firstName: string;
            role: string;
            branchId: string | null | undefined;
            plan: string;
            onboardingCompleted: boolean;
        };
        accessToken?: string;
    } = {
        message: "Logged in successfully",
        user: {
            id: result.userId,
            businessId: result.businessId,
            firstName: result.firstName,
            role: result.role,
            branchId: result.branchId,
            plan: result.plan,
            onboardingCompleted: result.onboardingCompleted,
        },
    };

    if (env.INCLUDE_ACCESS_TOKEN_IN_LOGIN === "true") {
        bodyJson.accessToken = accessToken;
    }

    const response = NextResponse.json(bodyJson, { status: 200 });

    response.cookies.set(COOKIE_NAMES.ACCESS, accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: ACCESS_TOKEN_TTL,
    });

    if (result.branchId) {
        response.cookies.set(COOKIE_NAMES.BRANCH, result.branchId, {
            httpOnly: false,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: ACCESS_TOKEN_TTL,
        });
    }

    return response;
}
