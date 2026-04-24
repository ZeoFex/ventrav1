import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { OnboardingView } from "@/app/components/onboarding";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";

export const metadata: Metadata = {
  title: "Set up your store — VentraPOS",
  description:
    "First-time setup for your VentraPOS business—tailored for Ghana (GHS, regions, receipts).",
};

async function redirectIfAlreadyOnboarded() {
  const store = await cookies();
  const token = store.get(COOKIE_NAMES.ACCESS)?.value;
  if (!token) return;

  let businessId: string | null = null;
  try {
    const payload = await verifyAccessToken(token);
    businessId = payload.bid || null;
  } catch {
    return;
  }

  if (!businessId) return;

  try {
    const [row] = await db
      .select({ onboardingCompleted: businesses.onboardingCompleted })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (row?.onboardingCompleted) {
      redirect("/dashboard");
    }
  } catch {
    // Fail open — render the wizard.
  }
}

export default async function OnboardingPage() {
  await redirectIfAlreadyOnboarded();
  return <OnboardingView />;
}
