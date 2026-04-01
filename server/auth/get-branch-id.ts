import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { COOKIE_NAMES } from "../config/auth-config";

/**
 * Read the active branch ID from the branch cookie.
 * Returns null when no branch is explicitly selected (= "All Branches" view).
 */
export function getActiveBranchId(
    cookieStore: { get: (name: string) => { value: string } | undefined }
): string | null {
    const value = cookieStore.get(COOKIE_NAMES.BRANCH)?.value;
    return value && value !== "all" ? value : null;
}
