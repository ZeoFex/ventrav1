import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema/users";
import { superadmins } from "../db/schema/superadmins";
import { superadminAuditLogs } from "../db/schema/superadmin-audit-logs";
import { hashPassword, verifyPassword } from "./password-service";
import { AuthError } from "./auth-service";
import { signSuperadminAccessToken, isSuperadminJwtConfigured } from "./superadmin-token-service";

export interface SuperadminLoginInput {
    email: string;
    passwordPlain: string;
    userAgent?: string;
    ipAddress?: string;
}

export interface SuperadminLoginResult {
    superadminId: string;
    email: string;
    firstName: string;
    lastName: string | null;
    accessToken: string;
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * Credential login for platform superadmins (separate from tenant `users`).
 */
export async function superadminLogin(
    input: SuperadminLoginInput
): Promise<SuperadminLoginResult> {
    if (!isSuperadminJwtConfigured()) {
        throw new AuthError(
            "SUPERADMIN_AUTH_DISABLED",
            "Superadmin login is not configured on this server",
        );
    }

    const emailNormalized = normalizeEmail(input.email);

    const [row] = await db
        .select({
            id: superadmins.id,
            passwordHash: superadmins.passwordHash,
            firstName: superadmins.firstName,
            lastName: superadmins.lastName,
            status: superadmins.status,
            email: superadmins.email,
        })
        .from(superadmins)
        .where(eq(superadmins.emailNormalized, emailNormalized))
        .limit(1);

    if (!row) {
        await new Promise((r) => setTimeout(r, 200));
        throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }

    const ok = await verifyPassword(row.passwordHash, input.passwordPlain);
    if (!ok) {
        throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (row.status === "suspended") {
        throw new AuthError("ACCOUNT_SUSPENDED", "This superadmin account is suspended.");
    }

    const now = new Date();
    await db.transaction(async (tx) => {
        await tx
            .update(superadmins)
            .set({ lastLoginAt: now, updatedAt: now })
            .where(eq(superadmins.id, row.id));

        await tx.insert(superadminAuditLogs).values({
            superadminId: row.id,
            action: "login",
            resource: "superadmin_auth",
            resourceId: row.id,
            userAgent: input.userAgent ?? "Unknown",
            ipAddress: input.ipAddress ?? "Unknown",
        });
    });

    const accessToken = await signSuperadminAccessToken({
        superadminId: row.id,
        email: row.email,
        firstName: row.firstName,
    });

    return {
        superadminId: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        accessToken,
    };
}

export interface CreateSuperadminInput {
    email: string;
    passwordPlain: string;
    firstName: string;
    lastName?: string;
    /** Who created (e.g. platform automation) — stored in audit metadata only */
    createdByLabel?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Create a superadmin row. Call only from routes protected by platform API key.
 * Rejects if email already exists on tenant `users` or `superadmins`.
 */
export async function createSuperadmin(input: CreateSuperadminInput): Promise<{
    id: string;
    email: string;
}> {
    const emailNormalized = normalizeEmail(input.email);

    const [tenantDup] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.emailNormalized, emailNormalized))
        .limit(1);
    if (tenantDup) {
        throw new AuthError(
            "EMAIL_IN_USE",
            "This email is already registered as a Ventra tenant user. Use a different email for superadmin.",
        );
    }

    const [saDup] = await db
        .select({ id: superadmins.id })
        .from(superadmins)
        .where(eq(superadmins.emailNormalized, emailNormalized))
        .limit(1);
    if (saDup) {
        throw new AuthError("DUPLICATE_EMAIL", "A superadmin with this email already exists.");
    }

    const passwordHash = await hashPassword(input.passwordPlain);
    const emailDisplay = input.email.trim();

    const [inserted] = await db
        .insert(superadmins)
        .values({
            email: emailDisplay,
            emailNormalized,
            passwordHash,
            firstName: input.firstName.trim(),
            lastName: input.lastName?.trim() || null,
            status: "active",
        })
        .returning({ id: superadmins.id, email: superadmins.email });

    if (!inserted) {
        throw new Error("Failed to create superadmin");
    }

    await db.insert(superadminAuditLogs).values({
        superadminId: inserted.id,
        action: "account_created",
        resource: "superadmin",
        resourceId: inserted.id,
        metadata: input.createdByLabel
            ? { createdBy: input.createdByLabel }
            : undefined,
        userAgent: input.userAgent ?? "Unknown",
        ipAddress: input.ipAddress ?? "Unknown",
    });

    return { id: inserted.id, email: inserted.email };
}

/**
 * Load superadmin by id; used after JWT verify to confirm still active.
 */
export async function getSuperadminById(id: string) {
    const [row] = await db
        .select({
            id: superadmins.id,
            email: superadmins.email,
            firstName: superadmins.firstName,
            lastName: superadmins.lastName,
            status: superadmins.status,
        })
        .from(superadmins)
        .where(eq(superadmins.id, id))
        .limit(1);
    return row ?? null;
}
