import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { SubscriptionGuard } from "@/app/components/dashboard/subscription-guard";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";

/**
 * Server-side guard: anyone who hasn't completed the onboarding wizard
 * is bounced back to /onboarding before any dashboard UI renders. This
 * catches users who closed their browser mid-flow and later log back in —
 * they resume exactly where they left off.
 */
async function ensureOnboarded() {
  const store = await cookies();
  const token = store.get(COOKIE_NAMES.ACCESS)?.value;
  if (!token) return; // proxy middleware already redirects unauthenticated users

  let businessId: string | null = null;
  let role: string | null = null;
  try {
    const payload = await verifyAccessToken(token);
    businessId = payload.bid || null;
    role = payload.role || null;
  } catch {
    return; // invalid token — let normal auth flow handle it
  }

  if (!businessId) return;

  // Staff skip owner onboarding — they inherit the business setup from the owner.
  if (role && role !== "owner") return;

  try {
    const [row] = await db
      .select({ onboardingCompleted: businesses.onboardingCompleted })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (row && !row.onboardingCompleted) {
      redirect("/onboarding");
    }
  } catch {
    // On DB errors, don't block dashboard access — fail open.
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureOnboarded();

  return (
    <DashboardShell>
      <SubscriptionGuard>{children}</SubscriptionGuard>
    </DashboardShell>
  );
}
