import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { roles, permissions, rolePermissions, userRoles } from "@/server/db/schema/roles";
import { eq, and, sql, inArray } from "drizzle-orm";
import { hashPassword } from "@/server/auth/password-service";

export async function createStaff(payload: {
    businessId: string;
    branchId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    passwordRaw: string;
    roleName: string;
    // permissionKeys only used if we need to create/update role on the fly
    permissionKeys?: string[];
}) {
    // 1. Hash password via project-standard Argon2id
    const hash = await hashPassword(payload.passwordRaw);

    return await db.transaction(async (tx) => {
        // 2. Create User
        const [user] = await tx.insert(users).values({
            businessId: payload.businessId,
            email: payload.email,
            emailNormalized: payload.email.toLowerCase().trim(),
            passwordHash: hash,
            firstName: payload.firstName,
            lastName: payload.lastName,
            phone: payload.phone,
            status: "active",
            emailVerified: true,
        }).returning();

        // 3. Find or Create Role
        let role = await tx.query.roles.findFirst({
            where: and(eq(roles.businessId, payload.businessId), eq(roles.name, payload.roleName))
        });

        if (!role) {
            [role] = await tx.insert(roles).values({
                businessId: payload.businessId,
                name: payload.roleName,
                isSystem: false,
            }).returning();

            // Map Permissions if provided
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

        // 5. Assign User to Role + Branch
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
        // Check if exists
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

        // Delete existing permissions for this role
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

        // Add new permissions
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
    const filters = [eq(users.businessId, businessId)];

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
    email: string;
    phone: string;
    passwordRaw?: string;
    roleName: string;
    branchId: string;
}) {
    // 1. Hash password if provided
    let hash: string | undefined;
    if (payload.passwordRaw) {
        hash = await hashPassword(payload.passwordRaw);
    }

    return await db.transaction(async (tx) => {
        // 2. Update User
        await tx.update(users).set({
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            emailNormalized: payload.email.toLowerCase().trim(),
            phone: payload.phone,
            ...(hash ? { passwordHash: hash } : {}),
        }).where(and(eq(users.id, id), eq(users.businessId, businessId)));

        // 3. Find Role (must exist or be created via modal first)
        const role = await tx.query.roles.findFirst({
            where: and(eq(roles.businessId, businessId), eq(roles.name, payload.roleName))
        });

        if (role) {
            // 4. Update User Role and Branch
            await tx.update(userRoles).set({
                roleId: role.id,
                branchId: payload.branchId,
            }).where(eq(userRoles.userId, id));
        }

        return { success: true };
    });
}
