import { LandingHero } from "./components/landing/hero";
import { LandingFeatures } from "./components/landing/features";
import { LandingAnalytics } from "./components/landing/analytics";
import { LandingOrders } from "./components/landing/orders";
import { LandingSecurity } from "./components/landing/security";
import { LandingWalkthrough } from "./components/landing/walkthrough";
import { LandingPricing } from "./components/landing/pricing";
import { LandingFaq } from "./components/landing/faq";
import { SiteHeader } from "./components/landing/site-header";
import { SiteFooter } from "./components/landing/site-footer";

import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";

export default async function Home() {
  const cookieStore = await cookies();
  const token = (await cookieStore).get("__ventra_at")?.value;

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
      <LandingHero isAuthenticated={isAuthenticated} />
      <LandingFeatures />
      <LandingAnalytics />
      <LandingOrders />
      <LandingSecurity />
      <LandingWalkthrough />
      <LandingPricing />
      <LandingFaq />
      <SiteFooter />
      
    </div>
  );
}
