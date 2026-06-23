import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { roles, permissions, rolePermissions, userRoles } from "@/server/db/schema/roles";
import { branches } from "@/server/db/schema/branches";
import { eq, and, sql, inArray, ne } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password-service";
import {
    phoneNormalizedKey,
    staffInternalEmail,
    normalizeGhanaPhone,
} from "@/server/auth/phone-utils";

export async function createStaff(payload: {
    businessId: string;
    branchId: string;
    firstName: string;
    lastName: string;
    phone: string;
    passwordRaw: string;
    roleName: string;
    permissionKeys?: string[];
}) {
    const phoneKey = phoneNormalizedKey(payload.phone);
    const internalEmail = staffInternalEmail(payload.businessId, phoneKey);
    const displayPhone = normalizeGhanaPhone(payload.phone);

    const hash = await hashPassword(payload.passwordRaw);

    return await db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({
            businessId: payload.businessId,
            email: internalEmail,
            emailNormalized: internalEmail.toLowerCase(),
            passwordHash: hash,
            firstName: payload.firstName,
            lastName: payload.lastName,
            phone: displayPhone,
            phoneNormalized: phoneKey,
            status: "active",
            emailVerified: true,
        }).returning();

        let role = await tx.query.roles.findFirst({
            where: and(eq(roles.businessId, payload.businessId), eq(roles.name, payload.roleName))
        });

        if (!role) {
            [role] = await tx.insert(roles).values({
                businessId: payload.businessId,
                name: payload.roleName,
                isSystem: false,
            }).returning();

            if (payload.permissionKeys && payload.permissionKeys.length > 0) {
                const dbPermissions = await tx.select().from(permissions)
                    .where(inArray(permissions.key, payload.permissionKeys));

                if (dbPermissions.length > 0) {
                    const rpValues = dbPermissions.map(p => ({
                        roleId: role!.id,
                        permissionId: p.id,
                    }));
                    await tx.insert(rolePermissions).values(rpValues);
                }
            }
        }

        await tx.insert(userRoles).values({
            userId: user.id,
            roleId: role.id,
            branchId: payload.branchId,
        });

        return { userId: user.id, roleId: role.id };
    });
}

export async function saveBusinessRole(payload: {
    businessId: string;
    name: string;
    permissionKeys: string[];
}) {
    return await db.transaction(async (tx) => {
        let role = await tx.query.roles.findFirst({
            where: and(eq(roles.businessId, payload.businessId), eq(roles.name, payload.name))
        });

        if (!role) {
            [role] = await tx.insert(roles).values({
                businessId: payload.businessId,
                name: payload.name,
                isSystem: false,
            }).returning();
        }

        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

        if (payload.permissionKeys.length > 0) {
            const dbPermissions = await tx.select().from(permissions)
                .where(inArray(permissions.key, payload.permissionKeys));

            if (dbPermissions.length > 0) {
                const rpValues = dbPermissions.map(p => ({
                    roleId: role!.id,
                    permissionId: p.id,
                }));
                await tx.insert(rolePermissions).values(rpValues);
            }
        }

        return role;
    });
}

export async function getStaffByBusiness(businessId: string, branchId?: string) {
    const filters = [eq(users.businessId, businessId), ne(roles.name, "owner")];

    if (branchId && branchId !== "all") {
        filters.push(eq(userRoles.branchId, branchId));
    }

    return await db.select({
        id: users.id,
        name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        email: users.email,
        phone: users.phone,
        status: users.status,
        roleName: roles.name,
        branchId: userRoles.branchId,
    })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(...filters));
}

export async function getStaffById(staffId: string, businessId: string) {
    const [row] = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            name: sql<string>`${users.firstName} || ' ' || COALESCE(${users.lastName}, '')`,
            email: users.email,
            phone: users.phone,
            status: users.status,
            avatarUrl: users.avatarUrl,
            roleId: roles.id,
            roleName: roles.name,
            branchId: userRoles.branchId,
            branchName: branches.name,
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(branches, eq(userRoles.branchId, branches.id))
        .where(and(eq(users.id, staffId), eq(users.businessId, businessId)))
        .limit(1);

    if (!row) return null;

    const rolePerms = await db
        .select({
            key: permissions.key,
            label: permissions.label,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, row.roleId));

    return {
        ...row,
        imageSrc: row.avatarUrl,
        permissionKeys: rolePerms.map((p) => p.key),
        permissions: rolePerms,
    };
}

export async function getBusinessRoles(businessId: string) {
    return await db.select().from(roles)
        .where(and(eq(roles.businessId, businessId), eq(roles.isSystem, false)));
}

export async function getRoleWithPermissions(roleId: string, businessId: string) {
    const role = await db.query.roles.findFirst({
        where: and(eq(roles.id, roleId), eq(roles.businessId, businessId)),
    });

    if (!role) return null;

    const rolePerms = await db.select({
        key: permissions.key
    })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, roleId));

    return {
        ...role,
        permissionKeys: rolePerms.map(p => p.key),
    };
}

export async function updateStaff(id: string, businessId: string, payload: {
    firstName: string;
    lastName?: string;
    phone: string;
    passwordRaw?: string;
    roleName: string;
    branchId: string;
}) {
    const phoneKey = phoneNormalizedKey(payload.phone);
    const internalEmail = staffInternalEmail(businessId, phoneKey);
    const displayPhone = normalizeGhanaPhone(payload.phone);

    let hash: string | undefined;
    if (payload.passwordRaw) {
        hash = await hashPassword(payload.passwordRaw);
    }

    return await db.transaction(async (tx) => {
        await tx.update(users).set({
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: internalEmail,
            emailNormalized: internalEmail.toLowerCase(),
            phone: displayPhone,
            phoneNormalized: phoneKey,
            ...(hash ? { passwordHash: hash } : {}),
        }).where(and(eq(users.id, id), eq(users.businessId, businessId)));

        const role = await tx.query.roles.findFirst({
            where: and(eq(roles.businessId, businessId), eq(roles.name, payload.roleName))
        });

        if (role) {
            await tx.update(userRoles).set({
                roleId: role.id,
                branchId: payload.branchId,
            }).where(eq(userRoles.userId, id));
        }

        return { success: true };
    });
}
