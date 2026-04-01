import { LandingPricing } from "@/app/components/landing/pricing";
import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing that grows with your business. Choose the plan that fits your needs, from small shops to large retail chains.",
};

export default async function PricingPage() {
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
      // invalid token
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader isAuthenticated={isAuthenticated} displayName={userFirstName} />
      <main className="flex-1 pt-20">
        <LandingPricing />
      </main>
      <SiteFooter />
    </div>
  );
}
