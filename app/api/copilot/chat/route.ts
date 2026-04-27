import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import {
  buildCopilotScope,
  type CopilotPosCartSnapshot,
} from "@/app/lib/copilot/scope";
import { isCopilotRateLimited } from "@/app/lib/copilot/rate-limit";
import { orchestrateCopilotChat } from "@/app/lib/copilot/executor/orchestrate";
import type { CopilotPreferredLanguage } from "@/app/lib/copilot/prompts/system";
import { encodeCopilotEvent } from "@/app/lib/copilot/stream/serialize";
import type { CopilotStreamEvent } from "@/app/lib/copilot/stream/events";
import { copilotAccessDeniedResponse } from "@/app/lib/copilot/plan-access";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { payload } = auth;
    const branchCookie = await getActiveBranchIdFromContext();

    const planDenied = await copilotAccessDeniedResponse(payload.bid);
    if (planDenied) return planDenied;

    if (await isCopilotRateLimited(payload.sub)) {
      return new Response(
        JSON.stringify({ error: "Copilot rate limit exceeded. Try again tomorrow." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as {
      messages?: unknown;
      pathname?: string;
      threadId?: string;
      preferredLanguage?: CopilotPreferredLanguage;
      posCart?: CopilotPosCartSnapshot | null;
    };

    if (body.messages === undefined) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const posCart = normalizePosCartSnapshot(body.posCart);
    const scope = buildCopilotScope(
      payload,
      branchCookie,
      body.pathname ?? null,
      posCart,
    );

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const push = (ev: CopilotStreamEvent) => {
          controller.enqueue(enc.encode(encodeCopilotEvent(ev)));
        };
        try {
          const pl = body.preferredLanguage;
          const preferredLanguage: CopilotPreferredLanguage =
            pl === "tw" || pl === "gaa" || pl === "ee" ? pl : "en";
          await orchestrateCopilotChat({
            scope,
            messages: body.messages,
            preferredLanguage,
            onEvent: push,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Copilot error";
          push({ type: "error", message });
          push({ type: "done" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("POST /api/copilot/chat", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const MAX_COPILOT_CART_LINES = 40;

function normalizePosCartSnapshot(
  raw: CopilotPosCartSnapshot | null | undefined,
): CopilotPosCartSnapshot | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const totalUnitsRaw = Number((raw as CopilotPosCartSnapshot).totalUnits);
  const linesIn = (raw as CopilotPosCartSnapshot).lines;
  if (!Array.isArray(linesIn) || linesIn.length < 1) {
    return null;
  }
  const lines = linesIn
    .slice(0, MAX_COPILOT_CART_LINES)
    .map((l) => {
      const productId = typeof l.productId === "string" ? l.productId : "";
      const qty = Math.min(99_999, Math.max(1, Math.floor(Number(l.qty) || 0)));
      const variationId =
        typeof l.variationId === "string" && l.variationId ? l.variationId : undefined;
      return { productId, qty, variationId };
    })
    .filter((l) => l.productId.length > 0);
  if (lines.length === 0) return null;
  const units = Number.isFinite(totalUnitsRaw) && totalUnitsRaw > 0
    ? Math.min(99_999_999, Math.floor(totalUnitsRaw))
    : lines.reduce((s, l) => s + l.qty, 0);
  return {
    lineCount: lines.length,
    totalUnits: units,
    lines,
  };
}
