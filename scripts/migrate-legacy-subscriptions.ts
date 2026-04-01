import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../server/db/schema";
import { businesses } from "../server/db/schema/businesses";
import { eq, isNull, and } from "drizzle-orm";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;
const client = postgres(connectionString, { 
    max: 1,
    ssl: "require",
    prepare: false // Recommended for pooler connections (port 6543)
});
const db = drizzle(client, { schema });

/**
 * Migration Script: migrate-legacy-subscriptions.ts
 * 
 * Purpose: 
 * Identifies businesses that were created before the subscription logic was implemented
 * (i.e., those with status 'active' but no 'currentPeriodEnd' date) and updates them 
 * to 'past_due' so they are prompted to pay.
 */
async function migrate() {
  console.log("🚀 Starting legacy subscription migration...");

  try {
    // Find all active businesses with no expiration date
    const legacyBusinesses = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(
        and(
          eq(businesses.subscriptionStatus, "active"),
          isNull(businesses.currentPeriodEnd)
        )
      );

    console.log(`📊 Found ${legacyBusinesses.length} legacy businesses to migrate.`);

    if (legacyBusinesses.length === 0) {
      console.log("✅ No legacy businesses found. Migration complete.");
      return;
    }

    let successCount = 0;
    for (const biz of legacyBusinesses) {
      try {
        await db
          .update(businesses)
          .set({
            subscriptionStatus: "past_due",
            currentPeriodEnd: new Date(0), // Set to epoch to ensure it's expired
          })
          .where(eq(businesses.id, biz.id));
        
        console.log(`   - Migrated: ${biz.name} (${biz.id})`);
        successCount++;
      } catch (err) {
        console.error(`   - ❌ Failed to migrate ${biz.name}:`, err);
      }
    }

    console.log(`\n🎉 Migration finished! Successfully updated ${successCount}/${legacyBusinesses.length} businesses.`);
  } catch (error) {
    console.error("❌ Critical error during migration:", error);
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
