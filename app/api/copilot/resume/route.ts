import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { redis } from "@/server/lib/redis";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { buildCopilotScope } from "@/app/lib/copilot/scope";
import { verifyResumeToken } from "@/app/lib/copilot/resume-token";
import { logCopilotAudit } from "@/app/lib/copilot/audit";
import { withCopilotIdempotency } from "@/app/lib/copilot/idempotency";
import { copilotAccessDeniedResponse } from "@/app/lib/copilot/plan-access";

export const runtime = "nodejs";

/**
 * Confirms a gated copilot action (e.g. export request). Idempotent per idempotencyKey.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { payload } = auth;
    const planDenied = await copilotAccessDeniedResponse(payload.bid);
    if (planDenied) return planDenied;

    const body = (await req.json()) as {
      resumeToken?: string;
      confirm?: boolean;
      idempotencyKey?: string;
    };

    if (!body.resumeToken?.trim()) {
      return Response.json({ error: "resumeToken required" }, { status: 400 });
    }

    const scope = buildCopilotScope(
      payload,
      await getActiveBranchIdFromContext(),
      null,
    );
    const verified = await verifyResumeToken(body.resumeToken);

    if (verified.userId !== payload.sub || verified.businessId !== payload.bid) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.confirm === false) {
      await logCopilotAudit(scope, {
        kind: "resume",
        summary: "User declined pending copilot action",
      });
      return Response.json({ ok: true, status: "declined" });
    }

    const redisKey = `copilot:pending:${verified.businessId}:${verified.pendingId}`;
    const raw = await redis.get(redisKey);
    if (!raw) {
      return Response.json(
        { error: "Pending action expired or already completed" },
        { status: 410 },
      );
    }

    const result = await withCopilotIdempotency(body.idempotencyKey, async () => {
      await redis.del(redisKey);
      await logCopilotAudit(scope, {
        kind: "resume",
        toolName: verified.kind,
        ok: true,
        summary: "Confirmed export request — generate file in product follow-up",
        idempotencyKey: body.idempotencyKey,
      });
      return { completed: true as const };
    });

    if (result.skipped) {
      await logCopilotAudit(scope, {
        kind: "idempotent_skip",
        idempotencyKey: body.idempotencyKey,
      });
      return Response.json({ ok: true, status: "already_processed" });
    }

    return Response.json({
      ok: true,
      status: "confirmed",
      message:
        "Export approved. (Wire CSV generation to your reporting pipeline as a follow-up.)",
    });
  } catch (e) {
    console.error("POST /api/copilot/resume", e);
    return Response.json({ error: "Invalid or expired token" }, { status: 400 });
  }
}
