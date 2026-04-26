import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { buildCopilotScope } from "@/app/lib/copilot/scope";
import { computeCopilotInsights } from "@/app/lib/copilot/insights-data";
import { copilotAccessDeniedResponse } from "@/app/lib/copilot/plan-access";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireUserAuthFromContext();
    if (auth instanceof NextResponse) return auth;
    const { payload } = auth;
    const planDenied = await copilotAccessDeniedResponse(payload.bid);
    if (planDenied) return planDenied;

    const branchId = await getActiveBranchIdFromContext();
    const scope = buildCopilotScope(payload, branchId, null);
    const insights = await computeCopilotInsights(scope);

    return Response.json(
      { insights },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("GET /api/copilot/insights", e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
