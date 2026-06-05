import { LandingFeatures } from "@/app/components/landing/features";
import { LandingAnalytics } from "@/app/components/landing/analytics";
import { LandingOrders } from "@/app/components/landing/orders";
import { LandingSecurity } from "@/app/components/landing/security";
import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { Metadata } from "next";
import { ReviewsSection } from "@/app/components/landing/reviews-section";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore the powerful features of VentraPOS — from inventory tracking and analytics to secure payments and multi-location management.",
};

export default async function FeaturesPage() {
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
        <LandingFeatures />
        <LandingAnalytics />
        <LandingOrders />
        <LandingSecurity />
        <ReviewsSection page="features" />
      </main>
      <SiteFooter />
    </div>
  );
}
