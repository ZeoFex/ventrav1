import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, "..", "app", "api");

function* walkRel(dir, base = "") {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkRel(p, path.join(base, e.name));
    else if (e.name === "route.ts") {
      const rel = (base + "/" + "route").replace(/\\/g, "/");
      const parts = rel
        .replace(/^\/+/, "")
        .replace(/\/route$/, "")
        .split("/");
      const segs = parts.map((part) => {
        const m = /^\[([^\]]+)\]$/.exec(part);
        if (m) {
          return `{${m[1]}}`;
        }
        return part;
      });
      const urlPath = "/api/" + segs.join("/");
      const content = fs.readFileSync(p, "utf8");
      const methods = ["get", "post", "put", "patch", "delete", "head", "options"].filter((m) =>
        new RegExp(`export\\s+async\\s+function\\s+${m}`, "i").test(content),
      );
      yield { urlPath, methods, tag: segs[0] || "api" };
    }
  }
}

const paths = {};
for (const { urlPath, methods, tag } of walkRel(apiRoot)) {
  paths[urlPath] = paths[urlPath] || {};
  for (const m of methods) {
    const op = m.toLowerCase();
    if (op === "head" || op === "options") continue;
    paths[urlPath][op] = {
      tags: [tag],
      security:
        op === "options"
          ? []
          : [
              { bearer: [] },
              { ventraAccessCookie: [] },
              { platformKey: [], actAsBusiness: [] },
            ],
      summary: `${op.toUpperCase()} ${urlPath}`,
      responses: {
        200: { description: "OK" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        500: { description: "Server error" },
      },
    };
  }
}

// Special: webhooks, cron, uploadthing, session
const overrideSecurity = (p, u) => {
  if (p.startsWith("/api/webhooks/")) {
    u.security = [{ paystackSignature: [] }];
  } else if (p.startsWith("/api/cron/")) {
    u.security = [{ cronSecret: [] }];
  } else if (p === "/api/auth/login" || p === "/api/auth/signup" || p.includes("forgot-password") || p.includes("reset-password") || p.includes("verify-email") || p === "/api/auth/resend-otp" || p === "/api/auth/verify-email" || p.includes("signup")) {
    u.security = [];
  } else if (p.startsWith("/api/uploadthing")) {
    u.security = [{ uploadthing: [] }, { bearer: [] }, { ventraAccessCookie: [] }];
  } else if (p.startsWith("/api/platform/")) {
    u.security = [{ platformKey: [] }];
  }
  return u;
};

for (const p of Object.keys(paths)) {
  for (const op of Object.keys(paths[p])) {
    overrideSecurity(p, paths[p][op]);
  }
}

const spec = {
  openapi: "3.1.0",
  info: {
    title: "VentraPOS API",
    version: "1.0.0",
    description:
      "HTTP API for VentraPOS. Authenticated calls support `Authorization: Bearer <access_token>` (JSON from POST /api/auth/login when enabled) and/or the `__ventra_at` access cookie. Send `X-Branch-Id` to scope a branch. See docs/API-SECURITY.md.",
  },
  servers: [{ url: "https://www.ventrapos.com" }],
  tags: [
    { name: "auth", description: "Authentication" },
    { name: "billing", description: "Billing, payments, subscriptions" },
    { name: "pos", description: "Point of sale" },
    { name: "products", description: "Catalog" },
    { name: "staff", description: "Staff and roles" },
    { name: "platform", description: "Superadmin / platform (VENTRA_PLATFORM_API_KEYS)" },
  ],
  components: {
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Access JWT" },
      ventraAccessCookie: {
        type: "apiKey",
        in: "cookie",
        name: "__ventra_at",
        description: "HttpOnly access cookie (same-origin and Electron).",
      },
      branchHeader: { type: "apiKey", in: "header", name: "X-Branch-Id", description: "Active branch id (optional)." },
      paystackSignature: { type: "apiKey", in: "header", name: "X-Paystack-Signature" },
      cronSecret: { type: "http", scheme: "bearer", description: "CRON_SECRET in Authorization header" },
      uploadthing: { type: "apiKey", in: "header", name: "x-uploadthing-version" },
      platformKey: {
        type: "apiKey",
        in: "header",
        name: "X-Ventra-Platform-Key",
        description:
          "Platform (superadmin) key from VENTRA_PLATFORM_API_KEYS. Use with X-Act-As-Business-Id on tenant routes, or alone on /api/platform/*.",
      },
      actAsBusiness: {
        type: "apiKey",
        in: "header",
        name: "X-Act-As-Business-Id",
        description: "Target business UUID when authenticating with X-Ventra-Platform-Key on tenant-scoped routes.",
      },
    },
  },
  security: [],
  paths,
};

const out = path.join(__dirname, "..", "public", "openapi.json");
fs.writeFileSync(out, JSON.stringify(spec, null, 2), "utf8");
console.log("wrote", out, "path count", Object.keys(paths).length);
