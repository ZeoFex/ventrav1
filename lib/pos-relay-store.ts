/**
 * Redis-backed relay for phone → desktop POS scans.
 * Uses Upstash Redis so sessions survive across Vercel serverless invocations.
 */

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const SESSION_TTL_SEC = 30 * 60; // 30 minutes
const KEY_PREFIX = "pos:relay:";

type ScanItem = {
  id: string;
  barcode: string;
  consumed: boolean;
};

type RelaySession = {
  token: string;
  scans: ScanItem[];
};

function sessionKey(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

function randomHex(bytes: number): string {
  const u = new Uint8Array(bytes);
  crypto.getRandomValues(u);
  return Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createRelaySession(): Promise<{
  sessionId: string;
  token: string;
}> {
  const sessionId = crypto.randomUUID();
  const token = randomHex(24);
  const session: RelaySession = { token, scans: [] };
  const key = sessionKey(sessionId);

  console.log(`[relay:create] sessionId=${sessionId} key=${key}`);

  await redis.set(key, JSON.stringify(session), {
    ex: SESSION_TTL_SEC,
  });

  console.log(`[relay:create] ✅ session stored in Redis, TTL=${SESSION_TTL_SEC}s`);

  return { sessionId, token };
}

export async function pushScan(
  sessionId: string,
  token: string,
  barcode: string,
): Promise<boolean> {
  const key = sessionKey(sessionId);
  console.log(`[relay:push] sessionId=${sessionId} barcode="${barcode}"`);

  const raw = await redis.get<string>(key);
  console.log(`[relay:push] redis.get → ${raw === null ? "NULL (session not found!)" : `found (${typeof raw}, length=${String(raw).length})`}`);

  if (!raw) return false;

  const session: RelaySession =
    typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as RelaySession);

  if (session.token !== token) {
    console.log(`[relay:push] ❌ token mismatch: expected=${session.token.slice(0, 6)}… got=${token.slice(0, 6)}…`);
    return false;
  }

  const trimmed = barcode.trim();
  if (!trimmed) {
    console.log(`[relay:push] ❌ barcode is empty after trim`);
    return false;
  }

  const scanId = crypto.randomUUID();
  session.scans.push({
    id: scanId,
    barcode: trimmed,
    consumed: false,
  });

  await redis.set(key, JSON.stringify(session), { ex: SESSION_TTL_SEC });
  console.log(`[relay:push] ✅ scan added (id=${scanId}), total scans=${session.scans.length}, unconsumed=${session.scans.filter(s => !s.consumed).length}`);
  return true;
}

export async function pollScans(
  sessionId: string,
  token: string,
): Promise<{ id: string; barcode: string }[]> {
  const key = sessionKey(sessionId);
  const raw = await redis.get<string>(key);

  if (!raw) {
    console.log(`[relay:poll] sessionId=${sessionId} → NULL (session not found)`);
    return [];
  }

  const session: RelaySession =
    typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as RelaySession);

  if (session.token !== token) {
    console.log(`[relay:poll] sessionId=${sessionId} → ❌ token mismatch`);
    return [];
  }

  const out: { id: string; barcode: string }[] = [];
  let changed = false;
  for (const sc of session.scans) {
    if (!sc.consumed) {
      sc.consumed = true;
      changed = true;
      out.push({ id: sc.id, barcode: sc.barcode });
    }
  }

  if (changed) {
    await redis.set(key, JSON.stringify(session), { ex: SESSION_TTL_SEC });
  }

  if (out.length > 0) {
    console.log(`[relay:poll] sessionId=${sessionId} → delivering ${out.length} scan(s): ${out.map(s => `"${s.barcode}"`).join(", ")}`);
  }

  return out;
}
