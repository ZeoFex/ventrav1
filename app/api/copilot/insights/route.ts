import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getActiveBranchId } from "@/server/auth/get-branch-id";
import { buildCopilotScope } from "@/app/lib/copilot/scope";
import { computeCopilotInsights } from "@/app/lib/copilot/insights-data";
import { copilotAccessDeniedResponse } from "@/app/lib/copilot/plan-access";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    const planDenied = await copilotAccessDeniedResponse(payload.bid);
    if (planDenied) return planDenied;

    const branchId = getActiveBranchId(cookieStore);
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
