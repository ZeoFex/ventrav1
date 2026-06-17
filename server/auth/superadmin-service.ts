import { count, eq } from "drizzle-orm";
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
    /** Superadmin id when created by a logged-in co-admin */
    createdBySuperadminId?: string;
    /** Only allowed when zero superadmins exist (first account setup). */
    bootstrapOnly?: boolean;
    ipAddress?: string;
    userAgent?: string;
}

export async function countSuperadmins(): Promise<number> {
    const [row] = await db.select({ n: count() }).from(superadmins);
    return Number(row?.n ?? 0);
}

export async function listSuperadminsBrief() {
    return db
        .select({
            id: superadmins.id,
            email: superadmins.email,
            firstName: superadmins.firstName,
            lastName: superadmins.lastName,
            status: superadmins.status,
            createdAt: superadmins.createdAt,
            lastLoginAt: superadmins.lastLoginAt,
        })
        .from(superadmins)
        .orderBy(superadmins.createdAt);
}

/**
 * Create a superadmin row. Call only from routes protected by platform API key.
 * Rejects if email already exists on tenant `users` or `superadmins`.
 */
export async function createSuperadmin(input: CreateSuperadminInput): Promise<{
    id: string;
    email: string;
}> {
    const run = async (
        tx: Pick<typeof db, "select" | "insert">
    ): Promise<{ id: string; email: string }> => {
        if (input.bootstrapOnly) {
            const [existing] = await tx
                .select({ n: count() })
                .from(superadmins);
            if (Number(existing?.n ?? 0) > 0) {
                throw new AuthError(
                    "BOOTSTRAP_CLOSED",
                    "An admin account already exists. Sign in or ask an existing admin to invite you."
                );
            }
        }

        const emailNormalized = normalizeEmail(input.email);

        const [tenantDup] = await tx
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

        const [saDup] = await tx
            .select({ id: superadmins.id })
            .from(superadmins)
            .where(eq(superadmins.emailNormalized, emailNormalized))
            .limit(1);
        if (saDup) {
            throw new AuthError("DUPLICATE_EMAIL", "A superadmin with this email already exists.");
        }

        const passwordHash = await hashPassword(input.passwordPlain);
        const emailDisplay = input.email.trim();

        const [inserted] = await tx
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

        const metadata: Record<string, string> = {};
        if (input.createdByLabel) metadata.createdBy = input.createdByLabel;
        if (input.createdBySuperadminId) {
            metadata.createdBySuperadminId = input.createdBySuperadminId;
        }

        await tx.insert(superadminAuditLogs).values({
            superadminId: inserted.id,
            action: "account_created",
            resource: "superadmin",
            resourceId: inserted.id,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
            userAgent: input.userAgent ?? "Unknown",
            ipAddress: input.ipAddress ?? "Unknown",
        });

        return { id: inserted.id, email: inserted.email };
    };

    if (input.bootstrapOnly) {
        return db.transaction(async (tx) => run(tx));
    }
    return run(db);
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

export interface UpdateSuperadminSelfInput {
    superadminId: string;
    currentPassword: string;
    email?: string;
    passwordPlain?: string;
    firstName?: string;
    lastName?: string;
    userAgent?: string;
    ipAddress?: string;
}

/**
 * Update the signed-in superadmin's profile. Email/password changes require current password.
 */
export async function updateSuperadminSelf(
    input: UpdateSuperadminSelfInput
): Promise<{ email: string; firstName: string; lastName: string | null }> {
    const [row] = await db
        .select({
            id: superadmins.id,
            email: superadmins.email,
            emailNormalized: superadmins.emailNormalized,
            passwordHash: superadmins.passwordHash,
            firstName: superadmins.firstName,
            lastName: superadmins.lastName,
            status: superadmins.status,
        })
        .from(superadmins)
        .where(eq(superadmins.id, input.superadminId))
        .limit(1);

    if (!row) {
        throw new AuthError("NOT_FOUND", "Account not found.");
    }
    if (row.status !== "active") {
        throw new AuthError("ACCOUNT_SUSPENDED", "This superadmin account is suspended.");
    }

    const currentOk = await verifyPassword(row.passwordHash, input.currentPassword);
    if (!currentOk) {
        throw new AuthError("INVALID_CREDENTIALS", "Current password is incorrect.");
    }

    const nextEmail = input.email?.trim() ?? row.email;
    const nextEmailNormalized = normalizeEmail(nextEmail);
    const emailChanging = nextEmailNormalized !== row.emailNormalized;

    if (emailChanging) {
        const [tenantDup] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.emailNormalized, nextEmailNormalized))
            .limit(1);
        if (tenantDup) {
            throw new AuthError(
                "EMAIL_IN_USE",
                "This email is already registered as a Ventra tenant user. Use a different email."
            );
        }

        const [saDup] = await db
            .select({ id: superadmins.id })
            .from(superadmins)
            .where(eq(superadmins.emailNormalized, nextEmailNormalized))
            .limit(1);
        if (saDup && saDup.id !== row.id) {
            throw new AuthError("DUPLICATE_EMAIL", "Another admin already uses this email.");
        }
    }

    const nextFirstName = input.firstName?.trim() ?? row.firstName;
    const nextLastName =
        input.lastName !== undefined ? input.lastName.trim() || null : row.lastName;
    const passwordChanging = !!input.passwordPlain;

    if (passwordChanging && input.passwordPlain!.length < 12) {
        throw new AuthError("WEAK_PASSWORD", "New password must be at least 12 characters.");
    }

    const patch: {
        email?: string;
        emailNormalized?: string;
        passwordHash?: string;
        firstName?: string;
        lastName?: string | null;
        updatedAt: Date;
    } = {
        updatedAt: new Date(),
        firstName: nextFirstName,
        lastName: nextLastName,
    };

    if (emailChanging) {
        patch.email = nextEmail;
        patch.emailNormalized = nextEmailNormalized;
    }
    if (passwordChanging) {
        patch.passwordHash = await hashPassword(input.passwordPlain!);
    }

    const [updated] = await db
        .update(superadmins)
        .set(patch)
        .where(eq(superadmins.id, row.id))
        .returning({
            email: superadmins.email,
            firstName: superadmins.firstName,
            lastName: superadmins.lastName,
        });

    if (!updated) {
        throw new Error("Failed to update superadmin");
    }

    await db.insert(superadminAuditLogs).values({
        superadminId: row.id,
        action: "account_updated",
        resource: "superadmin",
        resourceId: row.id,
        metadata: {
            emailChanged: emailChanging ? "true" : "false",
            passwordChanged: passwordChanging ? "true" : "false",
        },
        userAgent: input.userAgent ?? "Unknown",
        ipAddress: input.ipAddress ?? "Unknown",
    });

    return updated;
}

export interface UpdateSuperadminByAdminInput {
    targetId: string;
    actorSuperadminId?: string;
    actorLabel?: string;
    email?: string;
    passwordPlain?: string;
    firstName?: string;
    lastName?: string;
    status?: "active" | "suspended";
    userAgent?: string;
    ipAddress?: string;
}

/** Platform admin updates another superadmin (no current password required). */
export async function updateSuperadminByAdmin(input: UpdateSuperadminByAdminInput) {
    const [row] = await db
        .select({
            id: superadmins.id,
            email: superadmins.email,
            emailNormalized: superadmins.emailNormalized,
            firstName: superadmins.firstName,
            lastName: superadmins.lastName,
            status: superadmins.status,
        })
        .from(superadmins)
        .where(eq(superadmins.id, input.targetId))
        .limit(1);

    if (!row) {
        throw new AuthError("NOT_FOUND", "Account not found.");
    }

    const nextEmail = input.email?.trim() ?? row.email;
    const nextEmailNormalized = normalizeEmail(nextEmail);
    const emailChanging = input.email !== undefined && nextEmailNormalized !== row.emailNormalized;

    if (emailChanging) {
        const [tenantDup] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.emailNormalized, nextEmailNormalized))
            .limit(1);
        if (tenantDup) {
            throw new AuthError(
                "EMAIL_IN_USE",
                "This email is already registered as a Ventra tenant user."
            );
        }

        const [saDup] = await db
            .select({ id: superadmins.id })
            .from(superadmins)
            .where(eq(superadmins.emailNormalized, nextEmailNormalized))
            .limit(1);
        if (saDup && saDup.id !== row.id) {
            throw new AuthError("DUPLICATE_EMAIL", "Another admin already uses this email.");
        }
    }

    if (input.passwordPlain !== undefined && input.passwordPlain.length < 12) {
        throw new AuthError("WEAK_PASSWORD", "Password must be at least 12 characters.");
    }

    const patch: {
        email?: string;
        emailNormalized?: string;
        passwordHash?: string;
        firstName?: string;
        lastName?: string | null;
        status?: "active" | "suspended";
        updatedAt: Date;
    } = { updatedAt: new Date() };

    if (input.firstName !== undefined) patch.firstName = input.firstName.trim();
    if (input.lastName !== undefined) patch.lastName = input.lastName.trim() || null;
    if (emailChanging) {
        patch.email = nextEmail;
        patch.emailNormalized = nextEmailNormalized;
    }
    if (input.passwordPlain) {
        patch.passwordHash = await hashPassword(input.passwordPlain);
    }
    if (input.status !== undefined) patch.status = input.status;

    const [updated] = await db
        .update(superadmins)
        .set(patch)
        .where(eq(superadmins.id, row.id))
        .returning({
            id: superadmins.id,
            email: superadmins.email,
            firstName: superadmins.firstName,
            lastName: superadmins.lastName,
            status: superadmins.status,
        });

    if (!updated) {
        throw new Error("Failed to update superadmin");
    }

    await db.insert(superadminAuditLogs).values({
        superadminId: input.actorSuperadminId ?? null,
        action: "admin_updated_account",
        resource: "superadmin",
        resourceId: row.id,
        metadata: {
            targetId: row.id,
            actor: input.actorLabel ?? input.actorSuperadminId ?? "unknown",
            emailChanged: emailChanging ? "true" : "false",
            passwordReset: input.passwordPlain ? "true" : "false",
            status: input.status ?? row.status,
        },
        userAgent: input.userAgent ?? "Unknown",
        ipAddress: input.ipAddress ?? "Unknown",
    });

    return updated;
}

export interface DeleteSuperadminInput {
    targetId: string;
    actorSuperadminId?: string;
    actorLabel?: string;
    userAgent?: string;
    ipAddress?: string;
}

export async function deleteSuperadmin(input: DeleteSuperadminInput): Promise<void> {
    if (input.actorSuperadminId && input.targetId === input.actorSuperadminId) {
        throw new AuthError(
            "CANNOT_DELETE_SELF",
            "You cannot delete your own admin account while signed in."
        );
    }

    const total = await countSuperadmins();
    if (total <= 1) {
        throw new AuthError(
            "LAST_ADMIN",
            "Cannot delete the only remaining admin account."
        );
    }

    const [row] = await db
        .select({
            id: superadmins.id,
            email: superadmins.email,
        })
        .from(superadmins)
        .where(eq(superadmins.id, input.targetId))
        .limit(1);

    if (!row) {
        throw new AuthError("NOT_FOUND", "Account not found.");
    }

    await db.delete(superadmins).where(eq(superadmins.id, input.targetId));

    await db.insert(superadminAuditLogs).values({
        superadminId: input.actorSuperadminId ?? null,
        action: "admin_deleted_account",
        resource: "superadmin",
        resourceId: row.id,
        metadata: {
            deletedEmail: row.email,
            actor: input.actorLabel ?? input.actorSuperadminId ?? "unknown",
        },
        userAgent: input.userAgent ?? "Unknown",
        ipAddress: input.ipAddress ?? "Unknown",
    });
}
