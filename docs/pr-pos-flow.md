# PR: feat(pos): morphing search, add beep, and held sales

**Branch:** _(your branch, e.g. `feat/pos-flow`)_ → `main`  
**Scope:** **POS → New sale** — product search UX, **audio feedback** on add-to-cart, and **Held sales** (park cart, list, resume, discard) using **`localStorage`** until a backend exists.

---

## Summary

Improves the register flow with a **morphing category search** (round control expands into a search bar), a **short beep** when products are added from the grid, and a full **held sales** loop: **Hold sale** from the cart, browse holds at **`/dashboard/pos/held`**, **Resume** back into **New sale** with cart restored, or **Discard** with confirmation.

---

## What’s included

### 1. Category + search (morphing control)

- **`PosCategorySearchMorph`** replaces a static search button. Collapsed state is a **fixed 40×40 circle** (`size-10` + `shrink-0`) so flex layout does not squeeze it into a **vertical pill**.
- **Expand:** width/radius animate toward a wide **`rounded-xl`** bar; **Escape** and **click outside** collapse; input focuses shortly after expand.
- **Search state** is lifted to **`PosSaleView`**: the product grid filters by **name** and **description** (case-insensitive), after category filtering.
- **Accessibility:** `aria-expanded`, `role="button"` when collapsed, screen-reader label for the field.

### 2. Add-to-cart sound

- **`playPosAddProductBeep()`** in `pos-add-beep.ts` plays **`/sounds/pos/add%20product%20beep.mp3`** (file: `public/sounds/pos/add product beep.mp3`).
- One cached **`Audio`** instance; **`currentTime = 0`** before each play for rapid adds; **`play()`** promise rejection ignored (autoplay policy / missing file).

### 3. Held sales

- **Route:** **`/dashboard/pos/held`** (matches sidebar **POS → Held sales**).
- **`pos-held-sales-storage.ts`:** key `ventrapos-held-sales-v1` in **`localStorage`**; helpers for **`HeldSale`** (`id`, `label`, `lines`, `heldAt`).
- **New sale:** **`Hold sale`** on the cart (secondary control under **Continue to payment**) saves the cart, clears the register, navigates to the held list.
- **Resume:** navigates to **`/dashboard/pos/sale?resume=<id>`**; **`PosSaleResumeBridge`** hydrates lines, **removes** that hold, **`router.replace`** strips the query.
- **Discard:** browser **confirm**, then remove from storage; empty state + note that data is **this browser only**.
- **`PosSaleView`** is wrapped in **`Suspense`** for **`useSearchParams`** (Next.js App Router).

---

## Technical notes

| Area | Detail |
|------|--------|
| Search | Controlled `searchQuery` / `onSearchQueryChange` through **`PosCategoryBar`** → morph. |
| Hold / resume | No server; **`localStorage`** JSON array with validation on read. |
| Resume | **`removeHeldSale`** after load so each hold is **single-use** on resume. |

---

## Files

| Path | Role |
|------|------|
| `app/components/dashboard/pos/sale/pos-category-search-morph.tsx` | Morphing search UI |
| `app/components/dashboard/pos/sale/pos-category-bar.tsx` | Search props + layout |
| `app/components/dashboard/pos/sale/pos-sale-view.tsx` | Filters, beep, hold, resume bridge, `Suspense` |
| `app/components/dashboard/pos/sale/pos-cart-panel.tsx` | `onHoldSale` + **Hold sale** button |
| `app/components/dashboard/pos/sale/pos-add-beep.ts` | Beep helper |
| `app/components/dashboard/pos/sale/pos-held-sales-storage.ts` | Held-sale persistence |
| `app/components/dashboard/pos/sale/pos-held-sales-view.tsx` | Held list page UI |
| `app/(dashboard)/dashboard/pos/held/page.tsx` | Held sales route |
| `public/sounds/pos/add product beep.mp3` | Beep asset (ensure committed) |

---

## How to test

1. **Search** — **New sale** → tap round search → bar expands; type to filter products; **Esc** / outside click clears query and collapses (current behavior).
2. **Beep** — Add items from the grid; confirm sound (browser may require prior user gesture).
3. **Hold** — Add lines → **Hold sale** → **Held sales** list shows row with total and time.
4. **Resume** — **Resume** → **New sale** with cart restored; hold removed from list.
5. **Discard** — Confirm; row disappears.

---

## Follow-ups (optional)

- [ ] Server-backed holds + multi-register sync.
- [ ] Optional beep on cart **increment** only (can feel noisy).
- [ ] Keep search query when collapsing morph (currently clears on close).
- [ ] Rename sound file to remove spaces (optional path hygiene).

---

## Suggested commit / PR title

`feat(pos): morphing search, add beep, and held sales (localStorage)`
