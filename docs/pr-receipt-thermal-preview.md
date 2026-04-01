# PR: feat: live thermal receipt preview (onboarding)

**Branch:** _(your branch, e.g. `onboarding` or `feat/thermal-receipt-preview`)_ → `main`  
**Scope:** **Live preview** of how customer receipts will look on a **narrow thermal roll** (~58mm), on the onboarding **Logo & receipt text** step.

---

## Summary

Adds **`ReceiptThermalPreview`**—a monospace, light “paper” strip that updates as merchants edit **logo**, **header**, **footer**, and reflects **currency** (GHS `₵` by default) plus **VAT/NHIL** when enabled and a tax rate is set from the earlier **Money & tax** step. Sample line items and totals are **placeholder** content to illustrate layout; header/footer/store name come from onboarding state.

---

## What’s included

### UI / UX

- **Thermal styling:** ~58mm max width, monospace stack, off-white paper (`#f5f2eb`), dashed separators, subtle shadow—reads like **printed output**, not the main app chrome.
- **Logo:** Renders upload with **grayscale** to approximate thermal B/W; shows `[ Logo ]` placeholder when empty.
- **Header:** Uses **receipt header** lines when present; otherwise **store / legal name** + short hint.
- **Body:** Fixed sample lines (e.g. Milo, bread, water) with amounts in the chosen currency.
- **Totals:** Subtotal + optional **Tax (n%)** line when `taxRegistered` and rate &gt; 0; **TOTAL** updates accordingly.
- **Footer:** **Receipt footer** lines or placeholder copy (e.g. MoMo hint).
- **Meta:** `en-GH` date/time, sample invoice/POS line.
- **Layout:** Brand step is **two columns on `lg`** (form + sticky preview); stacked on small screens.
- **A11y:** Preview wrapped in `<section aria-label="Thermal receipt preview">`.

### Files

| File | Role |
|------|------|
| `app/components/onboarding/receipt-thermal-preview.tsx` | Preview component |
| `app/components/onboarding/onboarding-step-content.tsx` | Brand step: grid + copy tweak + import |

---

## How to test

1. `pnpm dev` → `/onboarding` → advance to **step 7** (Logo & receipt text).
2. Change **header/footer** — watch preview update.
3. Upload/remove **logo** — preview updates; logo appears grayscale.
4. Earlier steps: set **Money & tax** (VAT + rate) → on brand step, **Tax** line and **TOTAL** should reflect rate on sample subtotal.
5. Resize to **mobile** — preview below form, still readable.

---

## Follow-ups

- Replace sample line items with a prop or config from real POS settings later.
- Optional **80mm** width toggle if you support wider printers.
- Print/PDF export from the same component tree.

---

## Merge commit — extended description (copy for GitHub)

```text
feat: live thermal receipt preview on onboarding brand step

Add ReceiptThermalPreview (~58mm thermal): monospace paper strip, grayscale
logo, header/footer from fields, GHS formatting, sample items + tax line when
VAT enabled. Two-column layout on large screens; section label for a11y.
```
