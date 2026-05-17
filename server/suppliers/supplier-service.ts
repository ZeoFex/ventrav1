import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { suppliers, supplierPhones, supplyOrders } from "../db/schema/suppliers";

export type CreateSupplierInput = {
    businessId: string;
    branchId?: string | null;
    type: "individual" | "business";
    name: string;
    truckNumber?: string | null;
    email?: string | null;
    phones: string[];
};

export async function listSuppliers(businessId: string) {
    const rows = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.businessId, businessId))
        .orderBy(desc(suppliers.updatedAt));

    const ids = rows.map((r) => r.id);
    const phones =
        ids.length === 0
            ? []
            : await db
                  .select()
                  .from(supplierPhones)
                  .where(inArray(supplierPhones.supplierId, ids))
                  .orderBy(supplierPhones.sortOrder);

    const bySupplier = new Map<string, string[]>();
    for (const p of phones) {
        const list = bySupplier.get(p.supplierId) ?? [];
        list.push(p.phone);
        bySupplier.set(p.supplierId, list);
    }

    const owedRows =
        ids.length === 0
            ? []
            : await db
                  .select({
                      supplierId: supplyOrders.supplierId,
                      owed: sql<string>`COALESCE(SUM((${supplyOrders.totalCostGhs}::numeric) - (${supplyOrders.amountPaidGhs}::numeric)), 0)`,
                  })
                  .from(supplyOrders)
                  .where(and(eq(supplyOrders.businessId, businessId), inArray(supplyOrders.supplierId, ids)))
                  .groupBy(supplyOrders.supplierId);

    const owedBySupplier = new Map(owedRows.map((o) => [o.supplierId, Number(o.owed)]));

    return rows.map((r) => ({
        ...r,
        phones: bySupplier.get(r.id) ?? [],
        outstandingGhs: owedBySupplier.get(r.id) ?? 0,
    }));
}

export async function getSupplier(businessId: string, supplierId: string) {
    const [row] = await db
        .select()
        .from(suppliers)
        .where(and(eq(suppliers.id, supplierId), eq(suppliers.businessId, businessId)))
        .limit(1);

    if (!row) return null;

    const phones = await db
        .select()
        .from(supplierPhones)
        .where(eq(supplierPhones.supplierId, supplierId))
        .orderBy(supplierPhones.sortOrder);

    return {
        ...row,
        phones: phones.map((p) => ({ id: p.id, phone: p.phone, sortOrder: p.sortOrder })),
    };
}

export async function createSupplier(input: CreateSupplierInput) {
    return db.transaction(async (tx) => {
        const [s] = await tx
            .insert(suppliers)
            .values({
                businessId: input.businessId,
                branchId: input.branchId ?? null,
                type: input.type,
                name: input.name.trim(),
                truckNumber: input.truckNumber?.trim() || null,
                email: input.email?.trim() || null,
            })
            .returning();

        if (!s) throw new Error("Failed to create supplier");

        const nums = input.phones.map((p) => p.trim()).filter(Boolean);
        if (nums.length > 0) {
            await tx.insert(supplierPhones).values(
                nums.map((phone, i) => ({
                    supplierId: s.id,
                    phone,
                    sortOrder: i,
                })),
            );
        }

        return s;
    });
}

export async function updateSupplier(
    businessId: string,
    supplierId: string,
    input: Partial<Omit<CreateSupplierInput, "businessId" | "phones">> & { phones?: string[] },
) {
    return db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ id: suppliers.id })
            .from(suppliers)
            .where(and(eq(suppliers.id, supplierId), eq(suppliers.businessId, businessId)))
            .limit(1);
        if (!existing) return null;

        await tx
            .update(suppliers)
            .set({
                ...(input.type !== undefined ? { type: input.type } : {}),
                ...(input.name !== undefined ? { name: input.name.trim() } : {}),
                ...(input.truckNumber !== undefined
                    ? { truckNumber: input.truckNumber?.trim() || null }
                    : {}),
                ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
                ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
                updatedAt: new Date(),
            })
            .where(eq(suppliers.id, supplierId));

        if (input.phones) {
            await tx.delete(supplierPhones).where(eq(supplierPhones.supplierId, supplierId));
            const nums = input.phones.map((p) => p.trim()).filter(Boolean);
            if (nums.length > 0) {
                await tx.insert(supplierPhones).values(
                    nums.map((phone, i) => ({
                        supplierId,
                        phone,
                        sortOrder: i,
                    })),
                );
            }
        }

        return getSupplier(businessId, supplierId);
    });
}
