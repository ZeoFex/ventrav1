/**
 * Provision a VentraPOS superadmin via POST /api/superadmin/accounts (platform key auth).
 *
 * Usage:
 *   node scripts/create-superadmin.mjs <email> <password> "<first name>" "[last name]"
 *
 * Requires .env.local: VENTRA_PLATFORM_API_KEYS (comma-separated keys; uses the first).
 * Optional: NEXT_PUBLIC_APP_URL for base URL (default http://localhost:3000).
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import process from "node:process";

config({ path: resolve(process.cwd(), ".env.local") });

const keysRaw = process.env.VENTRA_PLATFORM_API_KEYS ?? "";
const platformKey = keysRaw.split(",").map((s) => s.trim()).find((k) => k.length >= 32);

if (!platformKey) {
  console.error("Missing VENTRA_PLATFORM_API_KEYS in .env.local (need at least one key ≥32 chars).");
  process.exit(1);
}

const [, , emailArg, passwordArg, firstNameArg, lastNameArg] = process.argv;
if (!emailArg || !passwordArg || !firstNameArg) {
  console.error(
    "Usage: node scripts/create-superadmin.mjs <email> <password> <firstName> [lastName]\n" +
      "Example: node scripts/create-superadmin.mjs ops@yourcompany.example SuperSecurePw123456 FirstName LastName"
  );
  process.exit(1);
}

if (passwordArg.length < 12) {
  console.error("Password must be at least 12 characters (API validation).");
  process.exit(1);
}

const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const url = `${base}/api/superadmin/accounts`;

const body = {
  email: emailArg.trim(),
  password: passwordArg,
  firstName: firstNameArg.trim(),
  ...(lastNameArg ? { lastName: lastNameArg.trim() } : {}),
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Ventra-Platform-Key": platformKey,
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  process.exit(1);
}

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, json);
  process.exit(1);
}

console.log("Created superadmin:", json);
