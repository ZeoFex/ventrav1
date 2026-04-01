import { db } from "../server/db";
import { users } from "../server/db/schema/users";
import { branches } from "../server/db/schema/branches";
import { categories, products } from "../server/db/schema/products";
import { sales, saleItems } from "../server/db/schema/sales";
import { eq } from "drizzle-orm";

async function main() {
    const email = "abenalacasera@gmail.com";
    console.log(`Starting simulation for ${email}...`);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
        console.error("User not found!");
        process.exit(1);
    }

    const businessId = user.businessId;
    const userId = user.id;

    // 1. Create Global Categories
    console.log("Setting up categories...");
    const categoryNames = ["Beverages", "Snacks", "Electronics", "Groceries", "Household"];
    for (const name of categoryNames) {
        await db.insert(categories)
            .values({
                businessId,
                name,
                slug: name.toLowerCase().replace(/\s+/g, "-"),
                description: `Global category for ${name}`,
            })
            .onConflictDoNothing();
    }
    
    const insertedCategories = await db.select().from(categories).where(eq(categories.businessId, businessId));
    console.log(`Found/Created ${insertedCategories.length} categories.`);

    // 2. Create 50 Branches
    console.log("Generating 50 branches...");
    const branchNames = Array.from({ length: 50 }).map((_, i) => ({
        businessId,
        name: `Ventra ${["Central", "West", "East", "North", "South", "Express", "Main", "Elite", "Prime", "Corner"][i % 10]} - Branch ${String(i + 1).padStart(2, '0')}`,
        code: `BR-${String(i + 1).padStart(3, '0')}`,
        region: ["Greater Accra", "Ashanti", "Western", "Eastern", "Northern"][i % 5],
        address: `${i + 101} POS Street, Phase ${Math.floor(i / 10) + 1}`,
        phone: `+233${Math.floor(Math.random() * 900000000) + 100000000}`,
        isMain: i === 0,
    }));

    for (const b of branchNames) {
        await db.insert(branches).values(b).onConflictDoNothing();
    }
    
    const insertedBranches = await db.select().from(branches).where(eq(branches.businessId, businessId));
    console.log(`Working with ${insertedBranches.length} branches.`);

    // 3. For each branch, generate products and sales
    for (const branch of insertedBranches) {
        console.log(`> Branch: ${branch.name}`);
        
        // Generate 15 products for this branch
        const productData = Array.from({ length: 15 }).map((_, i) => {
            const cat = insertedCategories[i % insertedCategories.length];
            const price = parseFloat((Math.random() * 45 + 5).toFixed(2));
            return {
                businessId,
                branchId: branch.id,
                categoryId: cat.id,
                name: `${cat.name} Item ${i + 1}`,
                slug: `${cat.name.toLowerCase()}-item-${i + 1}-${branch.id.slice(0, 8)}`,
                sku: `SKU-${branch.code}-${String(i + 1).padStart(3, '0')}`,
                priceGhs: price.toString(),
                costPriceGhs: (price * 0.7).toFixed(2),
                stock: Math.floor(Math.random() * 200) + 20,
                trackInventory: true,
            };
        });

        for (const p of productData) {
            await db.insert(products).values(p).onConflictDoNothing();
        }
        
        const insertedProducts = await db.select().from(products).where(eq(products.branchId, branch.id));
        if (insertedProducts.length === 0) continue;

        // Generate 30 sales for this branch over 30 days (reduced to 30 for speed/safety)
        console.log(`  Generating sales for ${branch.name}...`);
        const salesToInsert = [];
        for (let s = 0; s < 30; s++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            
            salesToInsert.push({
                businessId,
                branchId: branch.id,
                userId,
                invoiceId: `INV-${branch.code}-${String(s + 1).padStart(4, '0')}-${Math.floor(Math.random()*1000)}`,
                subtotalGhs: "0",
                taxGhs: "0",
                totalGhs: "0",
                paymentMethod: ["Cash", "Mobile Money", "Card"][Math.floor(Math.random() * 3)],
                itemCount: 0,
                createdAt: date,
            });
        }

        const insertedSales = await db.insert(sales).values(salesToInsert).returning();

        // Batch insert sale items and update
        for (const sale of insertedSales) {
            const numItems = Math.floor(Math.random() * 3) + 1;
            const items = [];
            let subtotal = 0;

            for (let i = 0; i < numItems; i++) {
                const prod = insertedProducts[Math.floor(Math.random() * insertedProducts.length)];
                const qty = Math.floor(Math.random() * 2) + 1;
                const unitPrice = parseFloat(prod.priceGhs);
                const lineTotal = unitPrice * qty;
                subtotal += lineTotal;

                items.push({
                    saleId: sale.id,
                    productId: prod.id,
                    productName: prod.name,
                    quantity: qty,
                    unitPriceGhs: unitPrice.toString(),
                    lineTotalGhs: lineTotal.toString(),
                });
            }

            if (items.length > 0) {
                await db.insert(saleItems).values(items);
            }
            
            const tax = subtotal * 0.15;
            const total = subtotal + tax;

            await db.update(sales)
                .set({
                    subtotalGhs: subtotal.toString(),
                    taxGhs: tax.toString(),
                    totalGhs: total.toString(),
                    itemCount: items.length,
                })
                .where(eq(sales.id, sale.id));
        }
    }

    console.log("Simulation complete!");
    process.exit(0);
}

main().catch(e => {
    console.error("FATAL ERROR DETECTED:");
    console.dir(e, { depth: null });
    process.exit(1);
});

