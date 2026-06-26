/**
 * Auth service — orchestrates signup, verification, and related flows.
 * This is the core business logic layer; route handlers are thin wrappers.
 */
import { eq } from "drizzle-orm";
import { db } from "../db";
import { businesses } from "../db/schema/businesses";
import { branches } from "../db/schema/branches";
import { users } from "../db/schema/users";
import { roles, userRoles, permissions, rolePermissions } from "../db/schema/roles";
import { emailVerifications } from "../db/schema/email-verifications";
import { pendingSubscriptions } from "../db/schema/pending-subscriptions";
import { passwordResets } from "../db/schema/password-resets";
import { auditLogs } from "../db/schema/audit-logs";
import { hashPassword, verifyPassword } from "./password-service";
import { generateOtp, verifyOtp } from "./otp-service";
import { sendOtpEmail, sendPasswordResetEmail } from "./email-service";
import { sendOtpSms } from "./sms-service";
import { OTP_TTL, OTP_MAX_ATTEMPTS, RESET_TOKEN_TTL } from "../config/auth-config";
import { PREMIUM_TRIAL_DAYS, type PlanId, isValidPlanId } from "@/config/plans";
import crypto from "crypto";
import { resolveAppBaseUrl } from "../lib/app-url";
import {
    resolveReferrerBusinessIdFromCode,
    ensureReferralCodeForBusiness,
} from "@/server/referrals/referral-service";
import { notifyShopCreated } from "@/server/platform/platform-notification-service";

// ─── Types ──────────────────────────────────────────────────────

export interface SignupInput {
    businessName: string;
    fullName: string;
    email: string;
    password: string;
    plan: PlanId;
    phone?: string;
    /** Optional referral code from ?ref= (referrer business). */
    referralCode?: string;
}

export interface SignupResult {
    userId: string;
    businessId: string;
    email: string;
    /** Raw OTP code — in production, only passed to the email job, never returned to client */
    otpCode: string;
}

export interface VerifyEmailInput {
    email: string;
    code: string;
}

export interface VerifyEmailResult {
    userId: string;
    businessId: string;
    firstName: string;
    email: string;
    role: string;
    branchId?: string;
    permissions: string[];
    plan: string;
    onboardingCompleted: boolean;
}

function generateVerificationLinkToken(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    return { rawToken, tokenHash };
}

function buildVerificationLink(baseUrl: string, rawToken: string): string {
    return `${baseUrl.replace(/\/$/, "")}/verify-email?token=${rawToken}`;
}

// ─── Signup ─────────────────────────────────────────────────────

/**
 * Create a new user account + business tenant.
 *
 * Flow:
 * 1. Normalize email
 * 2. Check for duplicate
 * 3. Hash password with Argon2id
 * 4. In a single transaction: create business, user, role, user_role, default branch
 * 5. Generate OTP and store hash
 * 6. Return result (caller handles email sending + response)
 */
export async function signup(input: SignupInput): Promise<SignupResult> {
    const emailNormalized = input.email.trim().toLowerCase();

    // 1. Check duplicate
    const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.emailNormalized, emailNormalized))
        .limit(1);

    if (existing.length > 0) {
        throw new AuthError(
            "DUPLICATE_EMAIL",
            "An account with this email already exists"
        );
    }

    // 2. Hash password (~200ms)
    const passwordHash = await hashPassword(input.password);

    // 3. Parse name
    const nameParts = input.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || input.fullName.trim();
    const lastName = nameParts.slice(1).join(" ") || null;

    // 4. Generate business slug
    const slug = generateSlug(input.businessName);

    let referredByBusinessId: string | null = null;
    const rawRef = input.referralCode?.trim();
    if (rawRef) {
        referredByBusinessId =
            await resolveReferrerBusinessIdFromCode(rawRef);
    }

    // 5. Transaction: create everything atomically
    const plan: PlanId = input.plan;
    const isPremiumTrial = plan === "growth" || plan === "pro";
    const trialEnd = isPremiumTrial
        ? new Date(Date.now() + PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000)
        : null;

    const result = await db.transaction(async (tx) => {
        const [business] = await tx
            .insert(businesses)
            .values({
                name: input.businessName.trim(),
                slug,
                contactEmail: emailNormalized,
                phone: input.phone?.trim() || null,
                plan,
                subscriptionStatus: "active",
                currentPeriodEnd: trialEnd,
                referredByBusinessId,
            })
            .returning({ id: businesses.id });

        const [user] = await tx
            .insert(users)
            .values({
                businessId: business.id,
                email: input.email.trim(),
                emailNormalized,
                passwordHash,
                firstName,
                lastName,
                phone: input.phone?.trim() || null,
                status: "pending_verification",
            })
            .returning({ id: users.id });

        // Create 'owner' role for this business
        const [ownerRole] = await tx
            .insert(roles)
            .values({
                businessId: business.id,
                name: "owner",
                isSystem: true,
            })
            .returning({ id: roles.id });

        // Assign owner role to user
        await tx.insert(userRoles).values({
            userId: user.id,
            roleId: ownerRole.id,
        });

        // Create default branch
        await tx.insert(branches).values({
            businessId: business.id,
            name: "Main Branch",
            code: "MAIN",
            isMain: true,
        });

        return { userId: user.id, businessId: business.id };
    });

    // 6. Generate OTP + one-click verification link token
    const { code, codeHash } = generateOtp();
    const { rawToken: linkRawToken, tokenHash: linkTokenHash } =
        generateVerificationLinkToken();

    await db.insert(emailVerifications).values({
        userId: result.userId,
        codeHash,
        linkTokenHash,
        expiresAt: new Date(Date.now() + OTP_TTL * 1000),
    });

    console.log(`[Signup API] Generated OTP ${code} for ${emailNormalized}`);

    const baseUrl = resolveAppBaseUrl();
    const verificationLink = buildVerificationLink(baseUrl, linkRawToken);

    // Fire and forget email delivery via Resend
    sendOtpEmail({
        to: emailNormalized,
        firstName,
        code,
        verificationLink,
    }).catch((err) => console.error("[Signup API] Failed to trigger sendOtpEmail:", err));

    // 7. Audit log
    await db.insert(auditLogs).values({
        userId: result.userId,
        businessId: result.businessId,
        action: "signup",
        resource: "user",
        resourceId: result.userId,
    });

    await ensureReferralCodeForBusiness(result.businessId).catch((err) =>
        console.error("[signup] ensureReferralCodeForBusiness:", err),
    );

    notifyShopCreated(
        result.businessId,
        input.businessName.trim(),
        emailNormalized
    );

    return {
        userId: result.userId,
        businessId: result.businessId,
        email: emailNormalized,
        otpCode: code,
    };
}

// ─── Verify Email ───────────────────────────────────────────────

/**
 * Verify email with 6-digit OTP code.
 *
 * Flow:
 * 1. Find user by email
 * 2. Find latest unused, unexpired OTP for this user
 * 3. Check attempt count (max 5)
 * 4. Verify code hash
 * 5. Mark OTP as used, activate user
 * 6. Return user context (caller issues JWT + cookies)
 */
export async function verifyEmail(
    input: VerifyEmailInput
): Promise<VerifyEmailResult> {
    const emailNormalized = input.email.trim().toLowerCase();

    // 1. Find user and business plan
    const [user] = await db
        .select({
            id: users.id,
            businessId: users.businessId,
            firstName: users.firstName,
            status: users.status,
            plan: businesses.plan,
            onboardingCompleted: businesses.onboardingCompleted,
        })
        .from(users)
        .innerJoin(businesses, eq(users.businessId, businesses.id))
        .where(eq(users.emailNormalized, emailNormalized))
        .limit(1);

    if (!user) {
        throw new AuthError("INVALID_OTP", "Invalid or expired verification code");
    }

    if (user.status === "active") {
        throw new AuthError("ALREADY_VERIFIED", "Email is already verified");
    }

    // 2. Find latest valid OTP
    const [otpRecord] = await db
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.userId, user.id))
        .orderBy(emailVerifications.createdAt)
        .limit(1);

    if (!otpRecord || otpRecord.isUsed || new Date() > otpRecord.expiresAt) {
        throw new AuthError("INVALID_OTP", "Invalid or expired verification code");
    }

    // 3. Check attempts
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
        throw new AuthError(
            "OTP_EXHAUSTED",
            "Too many verification attempts. Please request a new code."
        );
    }

    // 4. Verify code
    const isValid = verifyOtp(input.code, otpRecord.codeHash);

    if (!isValid) {
        // Increment attempts
        await db
            .update(emailVerifications)
            .set({ attempts: otpRecord.attempts + 1 })
            .where(eq(emailVerifications.id, otpRecord.id));

        throw new AuthError("INVALID_OTP", "Invalid or expired verification code");
    }

    // 5. Mark OTP used + activate user (transaction)
    await activateVerifiedUser(user.id, user.businessId, emailNormalized, otpRecord.id);

    console.log(`[Verify API] Successfully verified OTP for ${emailNormalized}`);

    // 6. Audit log
    await db.insert(auditLogs).values({
        userId: user.id,
        businessId: user.businessId,
        action: "email_verified",
        resource: "user",
        resourceId: user.id,
    });

    return buildVerifyEmailResult(
        user.id,
        emailNormalized,
        user.businessId,
        user.plan,
        !!user.onboardingCompleted,
    );
}

/**
 * Verify email via one-click link token (from signup / resend email).
 */
export async function verifyEmailByToken(token: string): Promise<VerifyEmailResult> {
    const trimmed = token.trim();
    if (!trimmed) {
        throw new AuthError("INVALID_OTP", "Invalid or expired verification link");
    }

    const tokenHash = crypto.createHash("sha256").update(trimmed).digest("hex");

    const [otpRecord] = await db
        .select()
        .from(emailVerifications)
        .where(eq(emailVerifications.linkTokenHash, tokenHash))
        .limit(1);

    if (!otpRecord || otpRecord.isUsed || new Date() > otpRecord.expiresAt) {
        throw new AuthError("INVALID_OTP", "Invalid or expired verification link");
    }

    const [user] = await db
        .select({
            id: users.id,
            businessId: users.businessId,
            firstName: users.firstName,
            status: users.status,
            plan: businesses.plan,
            onboardingCompleted: businesses.onboardingCompleted,
        })
        .from(users)
        .innerJoin(businesses, eq(users.businessId, businesses.id))
        .where(eq(users.id, otpRecord.userId))
        .limit(1);

    if (!user) {
        throw new AuthError("INVALID_OTP", "Invalid or expired verification link");
    }

    if (user.status === "active") {
        throw new AuthError("ALREADY_VERIFIED", "Email is already verified");
    }

    const [emailRow] = await db
        .select({ emailNormalized: users.emailNormalized })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
    const emailNormalized = emailRow?.emailNormalized ?? "";

    await activateVerifiedUser(user.id, user.businessId, emailNormalized, otpRecord.id);

    const [freshUser] = await db
        .select({
            plan: businesses.plan,
            onboardingCompleted: businesses.onboardingCompleted,
        })
        .from(users)
        .innerJoin(businesses, eq(users.businessId, businesses.id))
        .where(eq(users.id, user.id))
        .limit(1);

    await db.insert(auditLogs).values({
        userId: user.id,
        businessId: user.businessId,
        action: "email_verified_link",
        resource: "user",
        resourceId: user.id,
    });

    return buildVerifyEmailResult(
        user.id,
        emailNormalized,
        user.businessId,
        freshUser?.plan ?? user.plan,
        !!freshUser?.onboardingCompleted,
    );
}

async function activateVerifiedUser(
    userId: string,
    businessId: string,
    emailNormalized: string,
    verificationId: string,
): Promise<void> {
    await db.transaction(async (tx) => {
        await tx
            .update(emailVerifications)
            .set({ isUsed: true })
            .where(eq(emailVerifications.id, verificationId));

        await tx
            .update(users)
            .set({
                emailVerified: true,
                status: "active",
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        if (emailNormalized) {
            const [pending] = await tx
                .select()
                .from(pendingSubscriptions)
                .where(eq(pendingSubscriptions.email, emailNormalized))
                .limit(1);

            if (pending && pending.status === "success") {
                console.log(
                    `[Auth Service] Reconciling pending subscription for ${emailNormalized} → ${pending.plan}`,
                );
                const daysToAdd = pending.cycle === "annually" ? 365 : 30;
                const newExpiry = new Date(
                    Date.now() + daysToAdd * 24 * 60 * 60 * 1000,
                );

                await tx
                    .update(businesses)
                    .set({
                        plan: pending.plan as "starter" | "growth" | "pro",
                        subscriptionStatus: "active",
                        currentPeriodEnd: newExpiry,
                    })
                    .where(eq(businesses.id, businessId));

                await tx
                    .delete(pendingSubscriptions)
                    .where(eq(pendingSubscriptions.id, pending.id));
            }
        }
    });
}

async function buildVerifyEmailResult(
    userId: string,
    emailNormalized: string,
    businessId: string,
    plan: string,
    onboardingCompleted: boolean,
): Promise<VerifyEmailResult> {
    const [userRow] = await db
        .select({ firstName: users.firstName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

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
        userId,
        businessId,
        firstName: userRow?.firstName ?? "",
        email: emailNormalized,
        role: roleData[0]?.roleName || "owner",
        branchId: roleData[0]?.branchId || undefined,
        permissions: roleData.map((r) => r.permissionKey).filter((p): p is string => !!p),
        plan,
        onboardingCompleted,
    };
}

// ─── Resend OTP ────────────────────────────────────────────────

export async function resendOtp(
    email: string,
    channel: "email" | "sms" = "email",
    phone?: string
): Promise<{ otpCode: string } | null> {
    const emailNormalized = email.trim().toLowerCase();

    const [user] = await db
        .select({ id: users.id, status: users.status, firstName: users.firstName })
        .from(users)
        .where(eq(users.emailNormalized, emailNormalized))
        .limit(1);

    // Enumeration protection: don't reveal if user exists
    if (!user || user.status === "active") {
        return null;
    }

    const { code, codeHash } = generateOtp();
    const { rawToken: linkRawToken, tokenHash: linkTokenHash } =
        generateVerificationLinkToken();

    await db.insert(emailVerifications).values({
        userId: user.id,
        codeHash,
        linkTokenHash,
        expiresAt: new Date(Date.now() + OTP_TTL * 1000),
    });

    console.log(`[Resend OTP API] Resending new OTP ${code} to ${emailNormalized} via ${channel}`);

    if (channel === "sms" && phone) {
        sendOtpSms({ to: phone, code }).catch((err) =>
            console.error("[Resend OTP API] Failed to send SMS OTP:", err)
        );
    } else {
        const verificationLink = buildVerificationLink(
            resolveAppBaseUrl(),
            linkRawToken,
        );
        sendOtpEmail({
            to: emailNormalized,
            firstName: user.firstName,
            code,
            verificationLink,
        }).catch((err) =>
            console.error("[Resend OTP API] Failed to trigger sendOtpEmail:", err)
        );
    }

    return { otpCode: code };
}

// ─── Login ─────────────────────────────────────────────────────

export interface LoginInput {
    email: string;
    passwordPlain: string;
    userAgent?: string;
    ipAddress?: string;
}

export interface LoginResult {
    userId: string;
    businessId: string;
    firstName: string;
    email: string;
    role: string;
    branchId?: string;
    permissions: string[];
    plan: string;
    status: typeof users.$inferSelect.status;
    onboardingCompleted: boolean;
}

/**
 * Main login flow.
 * 
 * 1. Find user by email
 * 2. Verify password (Argon2id)
 * 3. Check account status (must not be suspended)
 * 4. Log successful login with IP/UA
 * 5. Return user context for JWT issuance
 */
export async function login(input: LoginInput): Promise<LoginResult> {
    const emailNormalized = input.email.trim().toLowerCase();

    // 1. Find user & business
    const [user] = await db
        .select({
            id: users.id,
            businessId: users.businessId,
            passwordHash: users.passwordHash,
            firstName: users.firstName,
            status: users.status,
            plan: businesses.plan,
            onboardingCompleted: businesses.onboardingCompleted,
        })
        .from(users)
        .innerJoin(businesses, eq(users.businessId, businesses.id))
        .where(eq(users.emailNormalized, emailNormalized))
        .limit(1);

    if (!user) {
        // Prevent user enumeration by taking roughly the same time as a successful hash check
        await new Promise(res => setTimeout(res, 200));
        throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }

    // 2. Hash check
    const isValid = await verifyPassword(user.passwordHash, input.passwordPlain);

    if (!isValid) {
        throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password");
    }

    // 3. Status checks
    if (user.status === "suspended") {
        throw new AuthError("ACCOUNT_SUSPENDED", "Account is suspended. Please contact support.");
    }
    if (user.status === "deactivated") {
        throw new AuthError("ACCOUNT_SUSPENDED", "Account has been deactivated.");
    }

    if (user.status === "pending_verification") {
        // We throw a specific error so the UI can redirect them to the OTP verification screen
        throw new AuthError("ACCOUNT_NOT_VERIFIED", "Please verify your email address to continue.");
    }

    // 4. Record successful login
    await db.transaction(async (tx) => {
        // Update user
        await tx.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

        // Audit log
        await tx.insert(auditLogs).values({
            userId: user.id,
            businessId: user.businessId,
            action: "login",
            resource: "auth",
            resourceId: user.id,
            userAgent: input.userAgent || "Unknown",
            ipAddress: input.ipAddress || "Unknown",
        });
    });

    console.log(`[Login API] Successful login for ${emailNormalized}`);

    // 5. Load role and permissions
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
        .where(eq(userRoles.userId, user.id));

    const roleName = roleData[0]?.roleName || "owner";

    if (roleName !== "owner") {
        throw new AuthError(
            "USE_STAFF_LOGIN",
            "Please sign in as Staff using your phone number and password."
        );
    }

    return {
        userId: user.id,
        businessId: user.businessId,
        firstName: user.firstName,
        email: emailNormalized,
        role: roleName,
        branchId: roleData[0]?.branchId || undefined,
        permissions: roleData.map(r => r.permissionKey).filter((p): p is string => !!p),
        plan: user.plan,
        status: user.status,
        onboardingCompleted: !!user.onboardingCompleted,
    };
}

// ─── Password Reset ─────────────────────────────────────────────

/**
 * Generate a password reset link and email it to the user.
 */
export async function requestPasswordReset(email: string, baseUrl: string): Promise<void> {
    const emailNormalized = email.trim().toLowerCase();

    const [user] = await db
        .select({ id: users.id, firstName: users.firstName, status: users.status })
        .from(users)
        .where(eq(users.emailNormalized, emailNormalized))
        .limit(1);

    // Prevent enumeration: silently return if user invalid
    if (!user || user.status === "deactivated" || user.status === "suspended") {
        return;
    }

    // 1. Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    // 2. Hash it for storage (so if DB leaks, reset tokens cannot be compromised)
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 3. Save to database
    await db.insert(passwordResets).values({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL * 1000), // 15 mins
    });

    // 4. Construct link and send email
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    console.log(`[Auth Service] Password reset requested for ${emailNormalized}`);

    sendPasswordResetEmail({
        to: emailNormalized,
        firstName: user.firstName,
        resetLink,
    }).catch(console.error);
}

export interface ResetPasswordInput {
    token: string;
    newPasswordPlain: string;
}

/**
 * Verify a reset token and update the password.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

    const [resetRecord] = await db
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.tokenHash, tokenHash))
        .limit(1);

    if (!resetRecord || resetRecord.isUsed || new Date() > resetRecord.expiresAt) {
        throw new AuthError("INVALID_CREDENTIALS", "Invalid or expired reset link. Please request a new one.");
    }

    // Hash the new password using Argon2id
    const newPasswordHash = await hashPassword(input.newPasswordPlain);

    // Update password and invalidate token in a transaction
    await db.transaction(async (tx) => {
        // Mark token used
        await tx.update(passwordResets)
            .set({ isUsed: true })
            .where(eq(passwordResets.id, resetRecord.id));

        // Update user
        await tx.update(users)
            .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
            .where(eq(users.id, resetRecord.userId));

        // Get user for audit log
        const [user] = await tx.select({ businessId: users.businessId }).from(users).where(eq(users.id, resetRecord.userId));

        if (user) {
            await tx.insert(auditLogs).values({
                userId: resetRecord.userId,
                businessId: user.businessId,
                action: "password_reset",
                resource: "user",
                resourceId: resetRecord.userId,
                userAgent: "System",
                ipAddress: "System",
            });
        }
    });
}

// ─── Helpers ────────────────────────────────────────────────────


function generateSlug(name: string): string {
    const base = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    // Append random suffix to prevent collisions
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
}

// ─── Error ──────────────────────────────────────────────────────

export type AuthErrorCode =
    | "DUPLICATE_EMAIL"
    | "EMAIL_IN_USE"
    | "INVALID_OTP"
    | "OTP_EXHAUSTED"
    | "ALREADY_VERIFIED"
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_SUSPENDED"
    | "ACCOUNT_NOT_VERIFIED"
    | "USE_STAFF_LOGIN"
    | "AMBIGUOUS_PHONE"
    | "RATE_LIMITED"
    | "SUPERADMIN_AUTH_DISABLED"
    | "BOOTSTRAP_CLOSED"
    | "NOT_FOUND"
    | "WEAK_PASSWORD"
    | "CANNOT_DELETE_SELF"
    | "LAST_ADMIN";

export class AuthError extends Error {
    code: AuthErrorCode;

    constructor(code: AuthErrorCode, message: string) {
        super(message);
        this.code = code;
        this.name = "AuthError";
    }
}
