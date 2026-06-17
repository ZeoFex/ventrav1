/**
 * Create a superadmin directly in Postgres (no running server / platform key required).
 * Usage: node scripts/create-superadmin-direct.mjs <email> [firstName] [lastName]
 * Password is printed once (auto-generated unless SUPERADMIN_BOOTSTRAP_PASSWORD is set).
 */
import { randomBytes } from "node:crypto";
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { hash } from "@node-rs/argon2";
import postgres from "postgres";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

function loadEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

function ensureEnvSecrets(envPath, env) {
  const updates = [];
  if (!env.SUPERADMIN_JWT_SECRET || env.SUPERADMIN_JWT_SECRET.length < 32) {
    env.SUPERADMIN_JWT_SECRET = randomBytes(48).toString("base64url");
    updates.push(`SUPERADMIN_JWT_SECRET=${env.SUPERADMIN_JWT_SECRET}`);
  }
  const keys = (env.VENTRA_PLATFORM_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((k) => k.length >= 32);
  if (keys.length === 0) {
    const key = randomBytes(48).toString("base64url");
    env.VENTRA_PLATFORM_API_KEYS = key;
    updates.push(`VENTRA_PLATFORM_API_KEYS=${key}`);
  }
  if (updates.length > 0) {
    appendFileSync(
      envPath,
      `\n# Added by create-superadmin-direct.mjs\n${updates.join("\n")}\n`,
      "utf8"
    );
  }
  return env;
}

const envPath = resolve(process.cwd(), ".env.local");
const env = ensureEnvSecrets(envPath, loadEnvFile(envPath));

const email = (process.argv[2] ?? "admin@ventrapos.local").trim().toLowerCase();
const firstName = (process.argv[3] ?? "Admin").trim();
const lastName = (process.argv[4] ?? "User").trim() || null;
const password =
  process.env.SUPERADMIN_BOOTSTRAP_PASSWORD ??
  randomBytes(18).toString("base64url");

if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const dbUrl = env.DIRECT_URL || env.DATABASE_URL;
if (!dbUrl) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });
const emailNormalized = email;
const passwordHash = await hash(password, ARGON2_OPTIONS);

try {
  const tenant = await sql`
    SELECT id FROM users WHERE email_normalized = ${emailNormalized} LIMIT 1
  `;
  if (tenant.length) {
    console.error("Email already used by a tenant user. Pick a different email.");
    process.exit(1);
  }

  const existing = await sql`
    SELECT id, email FROM superadmins WHERE email_normalized = ${emailNormalized} LIMIT 1
  `;
  if (existing.length) {
    console.log(
      JSON.stringify({
        status: "exists",
        email: existing[0].email,
        message: "Superadmin already exists for this email. Use login or pick another email.",
      })
    );
    process.exit(0);
  }

  const [row] = await sql`
    INSERT INTO superadmins (email, email_normalized, password_hash, first_name, last_name, status)
    VALUES (${email}, ${emailNormalized}, ${passwordHash}, ${firstName}, ${lastName}, 'active')
    RETURNING id, email
  `;

  console.log(
    JSON.stringify(
      {
        status: "created",
        id: row.id,
        email: row.email,
        firstName,
        lastName,
        password,
        loginUrl: `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin/catalog`,
      },
      null,
      2
    )
  );
} finally {
  await sql.end();
}
