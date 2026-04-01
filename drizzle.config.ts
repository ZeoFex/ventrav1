import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * IMPORTANT: drizzle-kit (push/pull/migrate) requires a DIRECT connection
 * to Postgres — NOT the Supabase transaction-mode pooler (port 6543).
 *
 * Use DIRECT_URL (port 5432) for drizzle-kit.
 * Use DATABASE_URL  (port 6543) for your app runtime (server/db/index.ts).
 *
 * If DIRECT_URL is not set, it falls back to DATABASE_URL but you MUST
 * ensure that URL uses port 5432 or the push will hang forever.
 */
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!;

export default defineConfig({
    schema: "./server/db/schema/index.ts",
    out: "./server/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: migrationUrl,
    },
    verbose: true,
    strict: true,
});

