/**
 * Staff login — phone + password, then SMS OTP verification.
 */
import { and, eq, ne, desc } from "drizzle-orm";
import { db } from "../db";
import { businesses } from "../db/schema/businesses";
import { users } from "../db/schema/users";
import { roles, userRoles, permissions, rolePermissions } from "../db/schema/roles";
import { emailVerifications } from "../db/schema/email-verifications";
import { auditLogs } from "../db/schema/audit-logs";
import { verifyPassword } from "./password-service";
import { generateOtp, verifyOtp } from "./otp-service";
import { sendOtpSms } from "./sms-service";
import { phoneNormalizedKey, normalizeGhanaPhone } from "./phone-utils";
import { OTP_TTL, OTP_MAX_ATTEMPTS } from "../config/auth-config";
import { AuthError, type LoginResult } from "./auth-service";

export interface StaffLoginInitInput {
    phone: string;
    passwordPlain: string;
}

export interface StaffLoginInitResult {
    phone: string;
    smsSent: boolean;
    /** Dev-only OTP when SMS is not configured or in development */
    otpCode?: string;
}

async function findStaffCandidatesByPhone(phoneKey: string) {
    return db
        .select({
            id: users.id,
            businessId: users.businessId,
            passwordHash: users.passwordHash,
            firstName: users.firstName,
            status: users.status,
            phone: users.phone,
            roleName: roles.name,
            plan: businesses.plan,
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .innerJoin(businesses, eq(users.businessId, businesses.id))
        .where(and(eq(users.phoneNormalized, phoneKey), ne(roles.name, "owner")))
        .limit(5);
}

async function loadStaffLoginResult(userId: string): Promise<LoginResult> {
    const [user] = await db
        .select({
            id: users.id,
            businessId: users.businessId,
            firstName: users.firstName,
            email: users.email,
            status: users.status,
            plan: businesses.plan,
        })
        .from(users)
        .innerJoin(businesses, eq(users.businessId, businesses.id))
        .where(eq(users.id, userId))
        .limit(1);

    if (!user) {
        throw new AuthError("INVALID_CREDENTIALS", "Invalid phone number or password");
    }

    const roleData = await db
        .select({
            roleName: roles.name,
            branchId: userRoles.branchId,
            permissionKey: permissions.key,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(userRoles.userId, userId));

    return {
        userId: user.id,
        businessId: user.businessId,
        firstName: user.firstName,
        email: user.email,
        role: roleData[0]?.roleName || "cashier",
        branchId: roleData[0]?.branchId || undefined,
        permissions: roleData.map((r) => r.permissionKey).filter((p): p is string => !!p),
        plan: user.plan,
        status: user.status,
        onboardingCompleted: true,
    };
}

function assertStaffAccountActive(status: string) {
    if (status === "suspended") {
        throw new AuthError("ACCOUNT_SUSPENDED", "Account is suspended. Please contact your manager.");
    }
    if (status === "deactivated") {
        throw new AuthError("ACCOUNT_SUSPENDED", "Account has been deactivated.");
    }
    if (status !== "active") {
        throw new AuthError("ACCOUNT_NOT_VERIFIED", "Account is not active. Contact your manager.");
    }
}

/**
 * Step 1: Validate phone + password, send SMS OTP.
 */
export async function initStaffLogin(
    input: StaffLoginInitInput
): Promise<StaffLoginInitResult> {
    const phoneKey = phoneNormalizedKey(input.phone);
    if (phoneKey.length < 9) {
        throw new AuthError("INVALID_CREDENTIALS", "Invalid phone number or password");
    }

    const candidates = await findStaffCandidatesByPhone(phoneKey);

    if (candidates.length === 0) {
        await new Promise((res) => setTimeout(res, 200));
        throw new AuthError("INVALID_CREDENTIALS", "Invalid phone number or password");
    }

    const matches: typeof candidates = [];
    for (const candidate of candidates) {
        const valid = await verifyPassword(candidate.passwordHash, input.passwordPlain);
        if (valid) matches.push(candidate);
    }

    if (matches.length === 0) {
        throw new AuthError("INVALID_CREDENTIALS", "Invalid phone number or password");
    }

    if (matches.length > 1) {
        throw new AuthError(
            "AMBIGUOUS_PHONE",
            "This phone number is linked to multiple staff accounts. Contact support."
        );
    }

    const staff = matches[0];
    assertStaffAccountActive(staff.status);

    const { code, codeHash } = generateOtp();

    await db.insert(emailVerifications).values({
        userId: staff.id,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL * 1000),
    });

    const smsPhone = staff.phone ? normalizeGhanaPhone(staff.phone) : normalizeGhanaPhone(input.phone);
    const smsResult = await sendOtpSms({ to: smsPhone, code });

    console.log(`[Staff Login] OTP initiated for ${phoneKey}`);

    const base = {
        phone: input.phone.trim(),
        smsSent: smsResult.success,
    };

    if (process.env.NODE_ENV === "development" || !smsResult.success) {
        return { ...base, otpCode: code };
    }

    return base;
}

/**
 * Step 2: Verify SMS OTP and complete staff login.
 */
export async function verifyStaffLogin(input: {
    phone: string;
    code: string;
    userAgent?: string;
    ipAddress?: string;
}): Promise<LoginResult> {
    const phoneKey = phoneNormalizedKey(input.phone);
    const candidates = await findStaffCandidatesByPhone(phoneKey);

    if (candidates.length !== 1) {
        throw new AuthError("INVALID_OTP", "Invalid or expired verification code");
    }

    const staff = candidates[0];
    assertStaffAccountActive(staff.status);

    const [otpRecord] = await db
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.userId, staff.id))
        .orderBy(desc(emailVerifications.createdAt))
        .limit(1);

    if (!otpRecord || otpRecord.isUsed || new Date() > otpRecord.expiresAt) {
        throw new AuthError("INVALID_OTP", "Invalid or expired verification code");
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        throw new AuthError(
            "OTP_EXHAUSTED",
            "Too many verification attempts. Please request a new code."
        );
    }

    const isValid = verifyOtp(input.code, otpRecord.codeHash);

    if (!isValid) {
        await db
            .update(emailVerifications)
            .set({ attempts: otpRecord.attempts + 1 })
            .where(eq(emailVerifications.id, otpRecord.id));

        throw new AuthError("INVALID_OTP", "Invalid or expired verification code");
    }

    await db.transaction(async (tx) => {
        await tx
            .update(emailVerifications)
            .set({ isUsed: true })
            .where(eq(emailVerifications.id, otpRecord.id));

        await tx
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, staff.id));

        await tx.insert(auditLogs).values({
            userId: staff.id,
            businessId: staff.businessId,
            action: "staff_login",
            resource: "auth",
            resourceId: staff.id,
            userAgent: input.userAgent || "Unknown",
            ipAddress: input.ipAddress || "Unknown",
        });
    });

    console.log(`[Staff Login] Successful OTP verification for ${phoneKey}`);

    return loadStaffLoginResult(staff.id);
}

/**
 * Resend staff login OTP (requires prior credential check in same session — phone only).
 */
export async function resendStaffLoginOtp(phone: string): Promise<{ otpCode?: string }> {
    const phoneKey = phoneNormalizedKey(phone);
    const candidates = await findStaffCandidatesByPhone(phoneKey);

    if (candidates.length !== 1) {
        return {};
    }

    const staff = candidates[0];
    if (staff.status !== "active") {
        return {};
    }

    const { code, codeHash } = generateOtp();

    await db.insert(emailVerifications).values({
        userId: staff.id,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL * 1000),
    });

    const smsPhone = staff.phone ? normalizeGhanaPhone(staff.phone) : normalizeGhanaPhone(phone);
    const smsResult = await sendOtpSms({ to: smsPhone, code });

    return process.env.NODE_ENV === "development" || !smsResult.success
        ? { otpCode: code }
        : {};
}
