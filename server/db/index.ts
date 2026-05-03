/**
 * Drizzle ORM database client.
 * Uses the 'postgres' driver (lightweight, no native bindings).
 * In production, connects to Supabase Postgres via pooler.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Serverless: keep pool small (Postgres max connections). Local dev: allow concurrent API routes.
// Production >1 lets parallel work (e.g. overview = stats + billing) complete without serializing on one socket.
const isDev = process.env.NODE_ENV === "development";
const client = postgres(connectionString, {
    max: isDev ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
