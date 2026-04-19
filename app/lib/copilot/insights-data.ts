import { getDashboardHomeData } from "@/server/pos/pos-service";
import { getProducts } from "@/server/products/product-service";

type ProductRow = Awaited<ReturnType<typeof getProducts>>[number];
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import type { CopilotScope } from "./scope";

export type CopilotInsight = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "warning" | "positive";
};

/**
 * Lightweight heuristics for the insights strip (same data sources as read tools).
 */
export async function computeCopilotInsights(
  scope: CopilotScope,
): Promise<CopilotInsight[]> {
  const out: CopilotInsight[] = [];

  const [home, products, billing] = await Promise.all([
    getDashboardHomeData(scope.businessId, scope.branchId),
    getProducts(scope.businessId, scope.branchId),
    db
      .select({
        plan: businesses.plan,
        subscriptionStatus: businesses.subscriptionStatus,
      })
      .from(businesses)
      .where(eq(businesses.id, scope.businessId))
      .limit(1),
  ]);

  if (home.vsYesterdayPercent < 0) {
    out.push({
      id: "sales-vs-yesterday",
      title: "Sales vs yesterday",
      body: `Today is ${home.vsYesterdayPercent}% below yesterday — review promotions or foot traffic.`,
      tone: "warning",
    });
  } else if (home.vsYesterdayPercent > 0) {
    out.push({
      id: "sales-vs-yesterday",
      title: "Sales vs yesterday",
      body: `Today is up ${home.vsYesterdayPercent}% vs yesterday.`,
      tone: "positive",
    });
  }

  const low = products.filter((p: ProductRow) => Number(p.stock) <= 5).length;
  if (low > 0) {
    out.push({
      id: "low-stock",
      title: "Low stock",
      body: `${low} product(s) at or below 5 units — check Inventory.`,
      tone: "warning",
    });
  }

  const b = billing[0];
  if (b?.subscriptionStatus === "past_due") {
    out.push({
      id: "billing",
      title: "Subscription",
      body: "Your subscription is past due — open Billing in Settings.",
      tone: "warning",
    });
  } else if (b?.plan === "starter") {
    out.push({
      id: "plan",
      title: "Plan",
      body: "You are on Starter — upgrade when you need more capacity.",
      tone: "info",
    });
  }

  return out.slice(0, 5);
}
