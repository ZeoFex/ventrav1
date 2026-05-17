/**
 * OpenAPI 3.1 `requestBody` entries merged by `generate-openapi.mjs`.
 * Keep in sync with handlers under app/api/**\/route.ts.
 */

const j = (required, schema, description) => ({
  required,
  ...(description ? { description } : {}),
  content: {
    "application/json": {
      schema,
    },
  },
});

const emptyJson = (description) =>
  j(false, { type: "object" }, description ?? "Optional empty JSON object; body can be omitted.");

const rawBody = (description) => ({
  description,
  content: {
    "application/octet-stream": {
      schema: {
        type: "string",
        format: "binary",
        description: "Raw request bytes (e.g. audio). Set Content-Type appropriately.",
      },
    },
  },
});

const paystackWebhook = {
  description:
    "Raw Paystack webhook JSON body. Validate with the X-Paystack-Signature header (HMAC-SHA512 of the raw bytes using PAYSTACK_SECRET_KEY).",
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "Paystack event envelope (fields such as event, data).",
        additionalProperties: true,
      },
    },
  },
};

/** @type {Array<{ path: string; method: string; requestBody: Record<string, unknown> }>} */
export const OPENAPI_REQUEST_BODIES = [
  {
    path: "/api/auth/login",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      },
      "Tenant user sign-in."
    ),
  },
  {
    path: "/api/auth/signup",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["businessName", "fullName", "email", "password"],
        additionalProperties: false,
        properties: {
          businessName: { type: "string", minLength: 2, maxLength: 255 },
          fullName: { type: "string", minLength: 2, maxLength: 200 },
          email: { type: "string", format: "email", maxLength: 320 },
          password: {
            type: "string",
            minLength: 8,
            maxLength: 128,
            description:
              "Must include upper, lower, digit, and special character (see route validation).",
          },
          referralCode: { type: "string", maxLength: 32 },
        },
      },
      "Create user + business tenant."
    ),
  },
  {
    path: "/api/auth/forgot-password",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["email"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      "Request password reset email."
    ),
  },
  {
    path: "/api/auth/reset-password",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["token", "newPassword"],
        additionalProperties: false,
        properties: {
          token: { type: "string", minLength: 1 },
          newPassword: { type: "string", minLength: 8 },
        },
      },
      "Complete reset using token from email link."
    ),
  },
  {
    path: "/api/auth/verify-email",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["email", "code"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", maxLength: 320 },
          code: { type: "string", pattern: "^\\d{6}$", description: "Six-digit OTP." },
        },
      },
      "Verify signup OTP."
    ),
  },
  {
    path: "/api/auth/resend-otp",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["email"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", maxLength: 320 },
          channel: { type: "string", enum: ["email", "sms"], default: "email" },
          phone: { type: "string", maxLength: 20 },
        },
      },
      "Resend verification OTP."
    ),
  },
  {
    path: "/api/auth/profile",
    method: "patch",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["firstName"],
        additionalProperties: false,
        properties: {
          firstName: { type: "string", minLength: 1, maxLength: 100 },
          lastName: { type: ["string", "null"], maxLength: 100 },
          phone: { type: ["string", "null"], maxLength: 30 },
          city: { type: ["string", "null"], maxLength: 100 },
        },
      },
      "Update the signed-in user's profile."
    ),
  },
  {
    path: "/api/auth/logout",
    method: "post",
    requestBody: emptyJson("Clears auth cookies; JSON body not required."),
  },
  {
    path: "/api/superadmin/auth/login",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      },
      "Superadmin email/password sign-in; returns JSON with accessToken for use as Bearer."
    ),
  },
  {
    path: "/api/superadmin/auth/logout",
    method: "post",
    requestBody: emptyJson("No body required."),
  },
  {
    path: "/api/superadmin/accounts",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["email", "password", "firstName"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 12 },
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string" },
        },
      },
      "Requires X-Ventra-Platform-Key header; creates a superadmin account."
    ),
  },
  {
    path: "/api/superadmin-docs/try",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["path"],
        additionalProperties: false,
        properties: {
          path: {
            type: "string",
            description: "GET path under /api/platform/ (same origin).",
            pattern: "^/api/platform/",
          },
        },
      },
      "Superadmin docs sandbox; also send X-Ventra-Platform-Key header."
    ),
  },
  {
    path: "/api/platform/users",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["businessId", "branchId", "firstName", "email", "phone", "password", "roleName"],
        additionalProperties: false,
        properties: {
          businessId: { type: "string", format: "uuid" },
          branchId: { type: "string", format: "uuid" },
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string", default: "" },
          email: { type: "string", format: "email" },
          phone: { type: "string", minLength: 1 },
          password: { type: "string", minLength: 6 },
          roleName: { type: "string", minLength: 1 },
          permissionKeys: { type: "array", items: { type: "string" }, default: [] },
        },
      },
      "Platform key or superadmin Bearer; creates staff-like user."
    ),
  },
  {
    path: "/api/platform/users/{id}",
    method: "patch",
    requestBody: j(
      true,
      {
        oneOf: [
          {
            type: "object",
            title: "Status-only",
            required: ["businessId", "status"],
            additionalProperties: false,
            properties: {
              businessId: { type: "string", format: "uuid" },
              status: {
                type: "string",
                enum: ["pending_verification", "active", "suspended", "deactivated"],
              },
            },
          },
          {
            type: "object",
            title: "Full profile",
            required: ["businessId", "firstName", "email", "phone", "roleName", "branchId"],
            additionalProperties: false,
            properties: {
              businessId: { type: "string", format: "uuid" },
              firstName: { type: "string", minLength: 1 },
              lastName: { type: "string", default: "" },
              email: { type: "string", format: "email" },
              phone: { type: "string", minLength: 1 },
              password: { type: "string", minLength: 6, description: "Optional; rotates password when set." },
              roleName: { type: "string", minLength: 1 },
              branchId: { type: "string", format: "uuid" },
            },
          },
        ],
      },
      "Shape depends on whether firstName is present (discriminant in handler)."
    ),
  },
  {
    path: "/api/platform/businesses/{id}",
    method: "patch",
    requestBody: j(
      true,
      {
        type: "object",
        description: "At least one property required.",
        properties: {
          name: { type: "string", minLength: 1 },
          status: { type: "string", enum: ["active", "suspended", "deactivated"] },
          plan: { type: "string", enum: ["starter", "growth", "pro"] },
          subscriptionStatus: {
            type: "string",
            enum: ["active", "past_due", "canceled"],
          },
          currentPeriodEnd: { type: ["string", "null"], format: "date-time" },
          extendSubscriptionDays: {
            type: "integer",
            minimum: 1,
            maximum: 3650,
            description:
              "Add this many days from max(now, existing currentPeriodEnd); mutually exclusive with currentPeriodEnd in the same request. Sets subscriptionStatus to active when that field is omitted.",
          },
        },
        additionalProperties: false,
      },
      "Tenant admin fields."
    ),
  },
  {
    path: "/api/onboarding/complete",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["storeName", "email"],
        additionalProperties: true,
        properties: {
          businessType: { type: ["string", "null"] },
          storeName: { type: "string", minLength: 1 },
          legalName: { type: "string" },
          registrationId: { type: "string" },
          phone: { type: "string" },
          email: { type: "string", format: "email" },
          addressLine: { type: "string" },
          city: { type: "string" },
          region: { type: "string" },
          currency: { type: "string", default: "GHS" },
          locale: { type: "string", default: "en-GH" },
          taxRegistered: { type: "boolean", default: false },
          taxType: { type: "string", default: "none" },
          taxRate: { type: "string", default: "0" },
          logoUrl: { type: ["string", "null"] },
          receiptHeader: { type: "string" },
          receiptFooter: { type: "string" },
          schedule: {
            type: "object",
            additionalProperties: true,
          },
          structure: { type: ["string", "null"], enum: ["single", "multi", null] },
          branches: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "region", "isMain"],
              properties: {
                name: { type: "string", minLength: 1 },
                region: { type: "string" },
                isMain: { type: "boolean" },
              },
            },
          },
          plan: { type: "string", enum: ["starter", "growth", "pro"], default: "starter" },
          cycle: { type: "string", enum: ["monthly", "annually"], default: "annually" },
        },
      },
      "Completes onboarding wizard; many fields optional with defaults in Zod schema."
    ),
  },
  {
    path: "/api/onboarding/progress",
    method: "put",
    requestBody: j(
      false,
      {
        type: "object",
        additionalProperties: true,
        properties: {
          stepIndex: { type: "integer", minimum: 0, maximum: 50 },
          data: { type: "object", additionalProperties: true },
          updatedAt: { type: "string" },
        },
      },
      "Persist wizard snapshot; all keys optional."
    ),
  },
  {
    path: "/api/billing/charge",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["plan", "phone", "provider"],
        additionalProperties: false,
        properties: {
          plan: { type: "string", enum: ["starter", "growth", "pro"] },
          cycle: { type: "string", enum: ["monthly", "annually"], default: "monthly" },
          phone: { type: "string", minLength: 9 },
          provider: { type: "string", enum: ["mtn", "vod", "tigo"] },
          preSignupEmail: { type: "string", format: "email", description: "Guest checkout email when no session." },
        },
      },
      "Initialize MoMo charge; Bearer optional."
    ),
  },
  {
    path: "/api/billing/otp",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["otp", "reference"],
        additionalProperties: false,
        properties: {
          otp: { type: "string", minLength: 4 },
          reference: { type: "string", minLength: 1 },
        },
      },
      "Submit Paystack OTP for authorized user."
    ),
  },
  {
    path: "/api/billing/referrals/claim",
    method: "post",
    requestBody: emptyJson("No JSON body."),
  },
  {
    path: "/api/staff",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["firstName", "email", "phone", "password", "roleName", "branchId", "permissionKeys"],
        additionalProperties: false,
        properties: {
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string", default: "" },
          email: { type: "string", format: "email" },
          phone: { type: "string", minLength: 1 },
          password: { type: "string", minLength: 6 },
          roleName: { type: "string", minLength: 1 },
          branchId: { type: "string", format: "uuid" },
          permissionKeys: { type: "array", items: { type: "string" } },
        },
      },
      "Owner-only; creates staff member."
    ),
  },
  {
    path: "/api/staff/{id}",
    method: "patch",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["firstName", "email", "phone", "roleName", "branchId"],
        additionalProperties: false,
        properties: {
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string", minLength: 1 },
          passwordRaw: { type: "string", description: "Optional; hash updated when provided." },
          roleName: { type: "string", minLength: 1 },
          branchId: { type: "string", format: "uuid" },
        },
      },
      "Owner-only; must match updateStaff payload (use passwordRaw, not password)."
    ),
  },
  {
    path: "/api/staff/roles",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["name"],
        additionalProperties: true,
        properties: {
          name: { type: "string", minLength: 1 },
          permissionKeys: { type: "array", items: { type: "string" }, default: [] },
        },
      },
      "Create custom role."
    ),
  },
  {
    path: "/api/branches",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["name"],
        additionalProperties: true,
        properties: {
          name: { type: "string", minLength: 1 },
          code: { type: ["string", "null"] },
          region: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
          isMain: { type: "boolean" },
          status: { type: "string", enum: ["active", "inactive"] },
        },
      },
      "businessId is inferred from JWT."
    ),
  },
  {
    path: "/api/branches/{id}",
    method: "put",
    requestBody: j(
      true,
      {
        type: "object",
        additionalProperties: true,
        description: "Partial branch fields forwarded to branch service.",
      },
      "Update branch."
    ),
  },
  {
    path: "/api/business",
    method: "patch",
    requestBody: j(
      true,
      {
        type: "object",
        additionalProperties: true,
        description: "Partial business config forwarded to update service.",
      },
      "Owner-only."
    ),
  },
  {
    path: "/api/customers",
    method: "post",
    requestBody: j(
      false,
      {
        type: "object",
        additionalProperties: true,
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          status: { type: "string", default: "active" },
        },
      },
      "Create customer.",
    ),
  },
  {
    path: "/api/customers/{id}",
    method: "patch",
    requestBody: j(
      false,
      {
        type: "object",
        additionalProperties: true,
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          status: { type: "string" },
        },
      },
      "Partial update; only supplied fields forwarded.",
    ),
  },
  {
    path: "/api/discounts",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["name", "type"],
        additionalProperties: true,
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          value: {
            description: "Required on create; numeric or string depends on discount type field.",
            oneOf: [{ type: "number" }, { type: "string" }],
          },
          isActive: { type: "boolean", default: true },
          autoApply: { type: "boolean", default: false },
          minOrderValueGhs: { type: ["number", "null"] },
          startDate: { type: ["string", "null"], description: "ISO date" },
          endDate: { type: ["string", "null"], description: "ISO date" },
        },
      },
      "value must be present when creating."
    ),
  },
  {
    path: "/api/discounts/{id}",
    method: "put",
    requestBody: j(
      true,
      {
        type: "object",
        additionalProperties: true,
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          value: { description: "Numeric or string per discount type." },
          isActive: { type: "boolean" },
          autoApply: { type: "boolean" },
          minOrderValueGhs: { type: ["number", "string", "null"] },
          startDate: { type: "string" },
          endDate: { type: "string" },
        },
      },
      "Replace/update discount columns.",
    ),
  },
  {
    path: "/api/finance/expenses",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["date"],
        additionalProperties: true,
        properties: {
          date: { type: "string", description: "Parsed as expense date (new Date(body.date))." },
        },
      },
      "Additional fields forwarded to createExpense."
    ),
  },
  {
    path: "/api/finance/expenses/{id}",
    method: "patch",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["status"],
        additionalProperties: false,
        properties: {
          status: { type: "string", enum: ["Paid", "Pending"] },
        },
      },
      "Update expense status.",
    ),
  },
  {
    path: "/api/notifications",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["title", "body"],
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1 },
          body: { type: "string", minLength: 1 },
          icon: { type: "string", default: "info" },
        },
      },
      "Create broadcast-style notification.",
    ),
  },
  {
    path: "/api/products",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        additionalProperties: true,
        description:
          "Product fields forwarded to catalog save (saveProduct). Must not use Global branch view.",
      },
      "Creates product for active branch.",
    ),
  },
  {
    path: "/api/products",
    method: "put",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["id"],
        additionalProperties: true,
        properties: {
          id: { type: "string", description: "Product UUID." },
          categoryId: { type: ["string", "null"] },
          name: { type: "string" },
          slug: { type: "string" },
          sku: { type: "string" },
          barcode: { type: "string" },
          description: { type: "string" },
          imageSrc: { type: "string" },
          priceGhs: { type: ["number", "string"] },
          costPriceGhs: { type: ["number", "string"] },
          stock: { type: "integer" },
          reorderAt: { type: "integer" },
          unit: { type: "string", default: "piece" },
          status: { type: "string" },
          tagIds: { type: "array", items: { type: "string" } },
        },
      },
      "Update product by id; other fields optional."
    ),
  },
  {
    path: "/api/products/bulk",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["items"],
        additionalProperties: false,
        properties: {
          items: {
            type: "array",
            items: { type: "object", additionalProperties: true },
            minItems: 1,
          },
        },
      },
      "CSV/import-style array of loose product-ish objects.",
    ),
  },
  {
    path: "/api/products/bulk-delete",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["ids"],
        additionalProperties: false,
        properties: {
          ids: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1 },
        },
      },
      "Delete many products by id.",
    ),
  },
  {
    path: "/api/products/categories",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["name"],
        additionalProperties: true,
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
        },
      },
      "Create category.",
    ),
  },
  {
    path: "/api/products/categories",
    method: "put",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["id"],
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
        },
      },
      "Update category.",
    ),
  },
  {
    path: "/api/products/tags",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        properties: {
          name: { type: "string" },
          color: { type: "string" },
        },
        additionalProperties: true,
      },
      "Create tag.",
    ),
  },
  {
    path: "/api/products/tags",
    method: "put",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["id"],
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          color: { type: "string" },
        },
      },
      "Update tag.",
    ),
  },
  {
    path: "/api/products/sync-main",
    method: "post",
    requestBody: emptyJson("Uses active branch cookie; syncs catalog from main branch."),
  },
  {
    path: "/api/products/categories/sync-main",
    method: "post",
    requestBody: emptyJson("Uses active branch; copies missing categories from main."),
  },
  {
    path: "/api/pos/checkout",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["lines", "invoiceId", "subtotalGhs", "taxGhs", "discountGhs", "totalGhs", "paymentMethod"],
        additionalProperties: true,
        properties: {
          lines: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["productId", "quantity", "productName", "unitPriceGhs", "lineTotalGhs"],
              properties: {
                productId: { type: "string" },
                variationId: { type: ["string", "null"] },
                quantity: { type: "number" },
                productName: { type: "string" },
                unitPriceGhs: { type: "number" },
                lineTotalGhs: { type: "number" },
              },
              additionalProperties: true,
            },
          },
          invoiceId: { type: "string" },
          subtotalGhs: { type: "number" },
          taxGhs: { type: "number" },
          discountGhs: { type: "number" },
          totalGhs: { type: "number" },
          paymentMethod: { type: "string" },
          customerId: { type: ["string", "null"] },
        },
      },
      "POS checkout cart snapshot.",
    ),
  },
  {
    path: "/api/pos/relay",
    method: "post",
    requestBody: emptyJson("Opens relay session; no JSON body."),
  },
  {
    path: "/api/pos/relay/{sessionId}/scan",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["token", "barcode"],
        additionalProperties: false,
        properties: {
          token: { type: "string", minLength: 1 },
          barcode: { type: "string", minLength: 1 },
        },
      },
      "Mobile scanner webhook.",
    ),
  },
  {
    path: "/api/sales/returns",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["saleId", "lines"],
        additionalProperties: true,
        properties: {
          saleId: { type: "string" },
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                saleItemId: { type: "string" },
                quantity: { type: "number" },
              },
              additionalProperties: true,
            },
          },
          reason: { type: "string" },
        },
      },
      "Process sale returns / stock restoration.",
    ),
  },
  {
    path: "/api/copilot/chat",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["messages"],
        additionalProperties: true,
        properties: {
          messages: {
            type: "array",
            description: "Conversation / model messages (shape validated server-side).",
          },
          pathname: { type: "string" },
          threadId: { type: "string" },
          preferredLanguage: { type: "string", enum: ["en", "tw", "gaa", "ee"] },
          posCart: { type: ["object", "null"], additionalProperties: true },
        },
      },
      "Returns application/x-ndjson stream."
    ),
  },
  {
    path: "/api/copilot/resume",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["resumeToken"],
        additionalProperties: true,
        properties: {
          resumeToken: { type: "string", minLength: 1 },
          confirm: { type: "boolean", default: true },
          idempotencyKey: { type: "string" },
        },
      },
      "Confirm or decline gated copilot action.",
    ),
  },
  {
    path: "/api/copilot/tts",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["text", "language"],
        additionalProperties: true,
        properties: {
          text: { type: "string", minLength: 1, maxLength: 4000 },
          language: { type: "string", description: "Khaya TTS language code." },
          translateFromEnglish: { type: "boolean", default: true },
        },
      },
      "Proxy TTS.",
    ),
  },
  {
    path: "/api/copilot/transcribe",
    method: "post",
    requestBody: rawBody(
      "Binary audio body; optional language query (default tw). Content-Type echoes upstream Khaya expectation."
    ),
  },
  {
    path: "/api/support/zuri/chat",
    method: "post",
    requestBody: j(
      true,
      {
        type: "object",
        required: ["messages"],
        additionalProperties: true,
        properties: {
          messages: {
            type: "array",
            description: "AI SDK UI messages array (safeValidateUIMessages).",
          },
        },
      },
      "Marketing/support assistant (stream).",
    ),
  },
  {
    path: "/api/webhooks/paystack",
    method: "post",
    requestBody: paystackWebhook,
  },
  {
    path: "/api/notifications",
    method: "patch",
    requestBody: emptyJson("Marks visible notifications read; no JSON body required."),
  },
  {
    path: "/api/notifications/{id}",
    method: "patch",
    requestBody: emptyJson("Marks one notification read; no JSON body."),
  },
];

/** @param {Record<string, Record<string, object>>} paths */
export function applyRequestBodies(paths) {
  for (const { path, method, requestBody } of OPENAPI_REQUEST_BODIES) {
    const op = paths[path]?.[method];
    if (op) {
      op.requestBody = requestBody;
    }
  }
}
