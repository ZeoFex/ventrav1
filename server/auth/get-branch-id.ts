import { cookies, headers } from "next/headers";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { BRANCH_ID_HEADER, COOKIE_NAMES } from "../config/auth-config";

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

/**
 * Prefer {@link BRANCH_ID_HEADER} on the request, then branch cookie. Same "all" / empty semantics.
 */
export function getActiveBranchIdFromRequest(
    request: Request,
    cookieStore: { get: (name: string) => { value: string } | undefined }
): string | null {
    const raw = request.headers.get(BRANCH_ID_HEADER) ?? request.headers.get("x-branch-id");
    const h = raw?.trim();
    if (h === "all" || h === "") {
        return null;
    }
    if (h) {
        return h;
    }
    return getActiveBranchId(cookieStore);
}

/** For handlers with no `Request` arg — same rules as {@link getActiveBranchIdFromRequest}. */
export async function getActiveBranchIdFromContext(): Promise<string | null> {
    const all = await headers();
    const h = all.get(BRANCH_ID_HEADER) ?? all.get("x-branch-id");
    const t = h?.trim();
    if (t === "all" || t === "") {
        return null;
    }
    if (t) {
        return t;
    }
    return getActiveBranchId(await cookies());
}
