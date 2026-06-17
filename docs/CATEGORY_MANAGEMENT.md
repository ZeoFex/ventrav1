# Dynamic Product Categories by Shop Type

This document describes how VentraPOS loads shop-type-specific categories and subcategories, and how product search uses them.

## Overview

When a merchant completes onboarding and selects a **Shop Type**, the system:

1. Saves the shop type on the `businesses.business_type` field (slug matching `shop_types.slug`).
2. Seeds default **categories** (and optional **subcategories**) into the merchant's main branch.
3. Lets merchants create, edit, or delete categories and subcategories at any time.

## Database

| Table | Purpose |
|-------|---------|
| `shop_types` | Reference catalog of supported shop types (`slug`, `name`) |
| `categories` | Branch-scoped product categories per business |
| `subcategories` | Nested under a category, branch-scoped |
| `products.subcategory_id` | Optional link from product to subcategory |

Migration: `server/db/migrations/0016_shop_types_categories.sql`

## Supported shop types

- Pharmacy
- Agrochemical Shop
- Building & Construction Materials
- Boutique / Fashion Store
- Supermarket
- Cold Store
- Electronics Store
- Hardware Store
- Stationery & Bookshop
- Furniture Store
- Cosmetics & Beauty Shop
- General Retail Store

Default category lists live in `server/catalog/shop-type-defaults.ts`.

## Registration / onboarding

The onboarding wizard step **Shop type** (`business-type`) presents all supported types. On completion, `completeOnboarding()` in `server/onboarding/onboarding-service.ts` calls `seedDefaultCategoriesForBusiness()` for the main branch.

Legacy `business_type` values (`retail`, `agro_chemicals`, `boutique`, etc.) are mapped to the new slugs via `resolveShopTypeSlug()`.

## APIs

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/products/categories` | GET, POST, PUT, DELETE | Category CRUD; GET supports `?q=` search |
| `/api/products/subcategories` | GET, POST, PUT, DELETE | Subcategory CRUD; GET supports `?categoryId=` and `?q=` |
| `/api/products/search` | GET | Relevance-ranked autocomplete; `?q=` and optional `?limit=` |

## Product form

`app/components/dashboard/products/product-form.tsx` uses `SearchableCombobox` for category and subcategory fields:

- Debounced server-side filtering
- Keyboard navigation (via `cmdk`)
- Create new category/subcategory inline

Product name field calls `/api/products/search` for intelligent suggestions while typing.

## Product search ranking

Search matches against: name, SKU, barcode, category name, subcategory name.

Relevance order (lower score = higher rank):

1. Exact field match
2. Prefix match
3. Contains match

Field weights favor product name over SKU/barcode over category/subcategory.

## Scripts

```bash
# Seed shop_types reference rows
npx tsx scripts/seed-shop-types.ts

# Backfill categories for existing businesses with none
npx tsx scripts/migrate-existing-business-categories.ts

# Apply migration
pnpm db:migrate
```

## Tests

- `server/catalog/__tests__/shop-type-defaults.test.ts`
- `server/products/__tests__/product-search-service.test.ts`

Run: `pnpm test`
