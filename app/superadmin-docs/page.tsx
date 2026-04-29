import type { Metadata } from "next";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { SuperadminDocsClient } from "./superadmin-docs-client";

export const metadata: Metadata = {
    title: "Superadmin platform API",
    description:
        "Platform key or superadmin Bearer JWT, GET /api/platform/overview, read lists, user and business writes, act-as, POST /api/superadmin/auth/login /accounts, and a browser GET sandbox for VentraPOS superadmin development.",
    robots: { index: false, follow: false },
};

export default async function SuperadminDocsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("__ventra_at")?.value;
    let userFirstName = "";
    let isAuthenticated = false;
    if (token) {
        try {
            const payload = await verifyAccessToken(token);
            userFirstName = payload.name;
            isAuthenticated = true;
        } catch {
            /* invalid */
        }
    }

    return (
        <div className="flex min-h-full flex-1 flex-col">
            <SiteHeader isAuthenticated={isAuthenticated} displayName={userFirstName} />
            <main className="flex-1 pt-24">
                <SuperadminDocsClient />
            </main>
            <SiteFooter />
        </div>
    );
}
