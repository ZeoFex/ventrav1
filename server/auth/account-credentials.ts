import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs, businesses, superadmins, users } from "@/server/db/schema";
import { isStaffInternalEmail } from "./phone-utils";
import { hashPassword, verifyPassword } from "./password-service";

export type CredentialFailure =
  | "NOT_FOUND"
  | "WRONG_PASSWORD"
  | "EMAIL_TAKEN"
  | "SAME_EMAIL"
  | "INVALID_EMAIL";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function loadUser(userId: string) {
  const [row] = await db
    .select({
      id: users.id,
      businessId: users.businessId,
      email: users.email,
      emailNormalized: users.emailNormalized,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

async function emailTakenBySomeoneElse(
  emailNormalized: string,
  userId: string,
): Promise<boolean> {
  const [otherUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.emailNormalized, emailNormalized), ne(users.id, userId)),
    )
    .limit(1);
  if (otherUser) return true;

  const [admin] = await db
    .select({ id: superadmins.id })
    .from(superadmins)
    .where(eq(superadmins.emailNormalized, emailNormalized))
    .limit(1);
  return Boolean(admin);
}

export async function changeAccountPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: CredentialFailure }> {
  const user = await loadUser(userId);
  if (!user) return { ok: false, reason: "NOT_FOUND" };

  const matches = await verifyPassword(user.passwordHash, currentPassword);
  if (!matches) return { ok: false, reason: "WRONG_PASSWORD" };

  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await tx.insert(auditLogs).values({
      userId,
      businessId: user.businessId,
      action: "password_changed",
      resource: "auth",
      resourceId: userId,
    });
  });

  return { ok: true };
}

export async function changeAccountEmail(
  userId: string,
  nextEmail: string,
  currentPassword: string,
): Promise<
  | { ok: true; email: string }
  | { ok: false; reason: CredentialFailure }
> {
  const emailNormalized = normalizeEmail(nextEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
    return { ok: false, reason: "INVALID_EMAIL" };
  }
  if (isStaffInternalEmail(emailNormalized)) {
    return { ok: false, reason: "INVALID_EMAIL" };
  }

  const user = await loadUser(userId);
  if (!user) return { ok: false, reason: "NOT_FOUND" };
  if (emailNormalized === user.emailNormalized) {
    return { ok: false, reason: "SAME_EMAIL" };
  }

  const matches = await verifyPassword(user.passwordHash, currentPassword);
  if (!matches) return { ok: false, reason: "WRONG_PASSWORD" };

  if (await emailTakenBySomeoneElse(emailNormalized, userId)) {
    return { ok: false, reason: "EMAIL_TAKEN" };
  }

  const previous = user.emailNormalized;
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        email: emailNormalized,
        emailNormalized,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await tx
      .update(businesses)
      .set({ contactEmail: emailNormalized, updatedAt: new Date() })
      .where(
        and(
          eq(businesses.id, user.businessId),
          sql`lower(${businesses.contactEmail}) = ${previous}`,
        ),
      );

    await tx.insert(auditLogs).values({
      userId,
      businessId: user.businessId,
      action: "email_changed",
      resource: "auth",
      resourceId: userId,
    });
  });

  return { ok: true, email: emailNormalized };
}
