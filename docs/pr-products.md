# PR: feat(dashboard): products catalog UI (list, add/edit, categories, tags, inventory)

**Branch:** _(your branch, e.g. `feat/products-catalog`)_ → `main`  
**Scope:** **Products** dashboard — **product list** with filters and thumbnails, **add / edit** product forms (including **photo**, **SKU**, **barcodes**), plus **Categories**, **Tags**, and **Stock / inventory** pages. All **mock data** until an API exists.

---

## Summary

Adds a full **catalog shell** under the dashboard: merchants can browse products with **search and filters**, open **Add product** or **Edit** (`/dashboard/products/[id]/edit`), manage **categories** and **tags** (with simple modals), and review **Inventory** with low-stock filtering. **SKU** can be **auto-generated**; **QR (Code 128 + data QR)** encodes product data for scanners; **product images** are supported on the form (upload preview + list thumbnails).

---

## What’s included

### Routes

| Route | Purpose |
|-------|---------|
| `/dashboard/products` | Product list |
| `/dashboard/products/new` | Add product |
| `/dashboard/products/[id]/edit` | Edit product |
| `/dashboard/products/categories` | Categories |
| `/dashboard/products/tags` | Tags |
| `/dashboard/inventory` | Stock & inventory |

Sidebar **Products** children include **Tags** (`/dashboard/products/tags`).

### Product list

- **Toolbar:** search (name / SKU), filters for **category**, **tag**, **status** (active / archived).
- **Table:** thumbnail (or placeholder), **name** + **Edit** link to edit route, SKU, category, tag chips, price, stock, status badge.
- **Empty states:** no products globally; no rows when filters match nothing (**Clear filters**).

### Add / edit product (shared `ProductForm`)

- **Photo:** file input (JPG, PNG, WebP, GIF), **preview**, **remove**; blob URLs **revoked** on change/unmount. Edit loads **existing `imageSrc`** from mock data.
- **Basics:** name, **SKU** with **Generate** (`VTR-{time}-{rand}`), description.
- **Pricing:** price (GHS), optional cost (not persisted in mock).
- **Inventory:** on hand, reorder at.
- **Category, tags** (checkboxes), **status** (active / archived).
- **Barcodes:** **`ProductBarcodePreview`** — **QR** encodes JSON payload (`product-catalog-codes.ts` v1: `id`, `sku`, optional `n`, `p`, `c`); **Code 128** encodes the SKU for laser scanners.
- **Save:** demo banner only (no backend).

### Categories & tags

- **Lists** with product counts; **Add category** / **Add tag** modals (client state only).
- **Delete** when count is 0; otherwise disabled with tooltip.

### Inventory

- Table: product, category, on hand, reorder at, **status** (in stock / low / out).
- **Low or out of stock** checkbox filter; illustrative retail value footnote.

### Mock data

- **`products-mock-data.ts`:** `MOCK_PRODUCTS`, `MOCK_CATEGORIES`, `MOCK_TAGS`; **`ProductRow`** includes optional **`description`** and **`imageSrc`** (Unsplash URLs in demo).
- **`getProductById`** for edit page; unknown id → **not found** screen.

---

## Technical notes

| Area | Detail |
|------|--------|
| Barcodes | **`qrcode`** (QR), **`jsbarcode`** (Code 128); **`parseProductBarcodePayload`** exported for future scan flows. |
| Images | List uses **`next/image`** with existing `images.unsplash.com` remote pattern; form preview uses **`<img>`** for blob + remote URLs. |
| Edit route | **`params` as `Promise`** (Next.js App Router) in **`[id]/edit/page.tsx`**. |

---

## Files (high level)

| Path | Role |
|------|------|
| `app/components/dashboard/products/product-form.tsx` | Shared add/edit form + image + barcodes |
| `app/components/dashboard/products/products-new-view.tsx` | `ProductForm` wrapper (new) |
| `app/components/dashboard/products/products-edit-view.tsx` | Load by id + `ProductForm` (edit) |
| `app/components/dashboard/products/products-list-view.tsx` | List, filters, thumbnails, Edit links |
| `app/components/dashboard/products/products-categories-view.tsx` | Categories |
| `app/components/dashboard/products/products-tags-view.tsx` | Tags |
| `app/components/dashboard/products/inventory-view.tsx` | Inventory |
| `app/components/dashboard/products/products-mock-data.ts` | Types + mock rows + `getProductById` |
| `app/components/dashboard/products/product-catalog-codes.ts` | SKU, QR JSON payload, parse |
| `app/components/dashboard/products/product-barcode-preview.tsx` | QR + Code 128 preview |
| `app/components/dashboard/products/products-page-shell.tsx` | Page header shell |
| `app/(dashboard)/dashboard/products/page.tsx` | List route |
| `app/(dashboard)/dashboard/products/new/page.tsx` | New route |
| `app/(dashboard)/dashboard/products/[id]/edit/page.tsx` | Edit route |
| `app/(dashboard)/dashboard/products/categories/page.tsx` | Categories route |
| `app/(dashboard)/dashboard/products/tags/page.tsx` | Tags route |
| `app/(dashboard)/dashboard/inventory/page.tsx` | Inventory route |
| `app/components/dashboard/sidebar/dashboard-nav-config.ts` | Tags nav child |

---

## How to test

1. **List** — Open **Products**; filter by category/tag/status; search by name or SKU; **Clear filters** when empty.
2. **Add** — **Add product** → fill fields, upload image, **Generate** SKU, confirm QR + linear barcode; **Save** shows demo banner.
3. **Edit** — From list, click name, thumb, or **Edit** → form pre-fills; change fields and image; **Save** shows demo banner.
4. **Not found** — Visit `/dashboard/products/invalid-id/edit` → not found + back link.
5. **Categories / tags** — Add row via modal; delete when count is 0.
6. **Inventory** — Toggle **Low or out of stock**; verify badges.

---

## Follow-ups (optional)

- [ ] API: CRUD products, categories, tags; upload to object storage.
- [ ] **Import** on list (currently disabled).
- [ ] Persist category/tag **add** beyond session (React state).
- [ ] POS: use same barcode payload for **scan to add** line item.

---

## Suggested commit / PR title

`feat(products): catalog pages, add/edit product forms, SKU & barcodes, images`
