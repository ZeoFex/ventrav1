import type { AuthTokenPayload } from "@/server/auth/token-service";

export type CopilotScope = {
  userId: string;
  businessId: string;
  role: string;
  permissions: string[];
  /** Resolved active branch, or null for “all branches”. */
  branchId: string | null;
  /** Client pathname for contextual help. */
  pathname: string | null;
};

export function buildCopilotScope(
  payload: AuthTokenPayload,
  branchId: string | null,
  pathname: string | null | undefined,
): CopilotScope {
  return {
    userId: payload.sub,
    businessId: payload.bid,
    role: payload.role,
    permissions: payload.perms ?? [],
    branchId,
    pathname: pathname ?? null,
  };
}
