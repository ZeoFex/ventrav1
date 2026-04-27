import type { AuthTokenPayload } from "@/server/auth/token-service";

/** Optional snapshot of the global POS cart (client-supplied; may be empty). */
export type CopilotPosCartSnapshot = {
  lineCount: number;
  totalUnits: number;
  lines: { productId: string; qty: number; variationId?: string }[];
};

export type CopilotScope = {
  userId: string;
  businessId: string;
  role: string;
  permissions: string[];
  /** Resolved active branch, or null for “all branches”. */
  branchId: string | null;
  /** Client pathname for contextual help. */
  pathname: string | null;
  /** When present, assistant can reason about the current register cart (product IDs only). */
  posCart: CopilotPosCartSnapshot | null;
};

export function buildCopilotScope(
  payload: AuthTokenPayload,
  branchId: string | null,
  pathname: string | null | undefined,
  posCart: CopilotPosCartSnapshot | null = null,
): CopilotScope {
  return {
    userId: payload.sub,
    businessId: payload.bid,
    role: payload.role,
    permissions: payload.perms ?? [],
    branchId,
    pathname: pathname ?? null,
    posCart,
  };
}
