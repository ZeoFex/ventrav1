/**
 * Drizzle ORM database client.
 * Uses the 'postgres' driver (lightweight, no native bindings).
 * In production, connects to Supabase Postgres via pooler.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Use max 1 connection for serverless environments (Next.js API routes)
const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
