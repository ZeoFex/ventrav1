import { eq } from "drizzle-orm";
import {
  canAccess,
  COPILOT_FEATURE_ID,
  type PlanId,
} from "@/config/plan-feature-access";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";

/**
 * Whether this business may use Zuri in-dashboard assistant (Pro-only; feature id `copilot`).
 */
export async function businessHasCopilotAccess(
  businessId: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      plan: businesses.plan,
      subscriptionStatus: businesses.subscriptionStatus,
      currentPeriodEnd: businesses.currentPeriodEnd,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const plan = row?.plan as PlanId | undefined;
  if (!plan) return false;
  return canAccess(
    plan,
    COPILOT_FEATURE_ID,
    row.subscriptionStatus,
    row.currentPeriodEnd,
  );
}

export function copilotProRequiredResponse(): Response {
  return new Response(
    JSON.stringify({
      error:
        "Zuri (in-dashboard assistant) is included with the Pro plan. Upgrade in Settings → Billing.",
    }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
}

/** Returns a 403 Response when the business is not on Pro, otherwise null. */
export async function copilotAccessDeniedResponse(
  businessId: string,
): Promise<Response | null> {
  if (await businessHasCopilotAccess(businessId)) return null;
  return copilotProRequiredResponse();
}
