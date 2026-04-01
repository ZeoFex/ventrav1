# PR: feat: onboarding & signup → onboarding handoff

**Branch:** `onboarding` → `main` (adjust branch name if different)  
**Scope:** First-time **store setup wizard** (Ghana-focused), **forgot-password** full UI, and **post-OTP navigation** into onboarding with **prefilled** fields from signup.

---

## Summary

Adds **`/onboarding`**—a minimal, multi-step wizard aligned with **Financial Atelier** (tonal surfaces, green gradient CTAs, sticky progress + footer). Defaults target **Ghana** (GHS, `en-GH`, all **16 regions**). **No map / GPS step** (explicit copy on address step).

Wires **signup OTP verification** to **`router.push("/onboarding")`** and passes **email**, **store name**, and **legal name** via **`sessionStorage`** (`app/lib/onboarding-prefill.ts`), consumed once on onboarding mount.

---

## What’s included

### Onboarding (`/onboarding`)

| Step | Screen |
|------|--------|
| Welcome | Ghana / GHS positioning |
| Business type | Tile grid (retail, restaurant, …, other) |
| Store name | Single field |
| Profile | Legal name + optional TIN / registration |
| Contact | Phone + email |
| Address | Street, city, **region** (no map) |
| Money & tax | GHS default, locale, optional VAT/NHIL + rate |
| Brand | Logo upload + receipt header/footer |
| Hours | Open/close + closed Sundays |
| Structure | Single vs multi-branch |
| *(multi only)* Branch intro | Copy on outlets / MoMo / regions |
| *(multi only)* Main branch | Name + region (prefills from store name / address region) |
| *(multi only)* Extra outlet | Optional second branch name |
| *(multi only)* Branch contact | Optional note (manager / phone) |
| *(multi only)* Branch review | Summary cards |
| Checklist | What’s covered so far (visual ✓ list) |
| Guided | Product, staff, finance, POS + first-sale hint (aligned with `screens.mdc` 58–62) |
| Complete | Stronger handoff + branch recap if multi + **Go to home** → `/` |

- **`app/onboarding/page.tsx`** — metadata + `OnboardingView`
- **`app/components/onboarding/`** — `types`, `constants` (regions, business types), `onboarding-input-classes`, `onboarding-step-content`, `onboarding-view`, `index.ts`

### Signup → onboarding

- **`signup-view.tsx`:** after valid OTP submit, `writeOnboardingPrefill({ email, storeName, legalName })` then **`router.push("/onboarding")`**
- **`onboarding-view.tsx`:** on mount, reads + clears prefill key and merges into form state
- **`app/lib/onboarding-prefill.ts`** — storage key + writer (reader inlined in onboarding for a single consumer)

### Forgot password (if merged with this branch)

- Full **two-panel slide**: request email → “link sent” with masked email, resend cooldown, different email, back to sign in
- **`app/components/auth/forgot-password/`** + **`app/(auth)/forgot-password/page.tsx`**

### Docs

- **`README.md`** — routes table includes `/onboarding`

---

## Technical notes

| Topic | Detail |
|--------|--------|
| OTP | Still **client-side success** until verify API exists; navigation runs after 6-digit OTP passes local validation |
| Prefill | **One-time** read; key removed after hydration to avoid stale data |
| Progress | Bar in header; form steps labeled “Step X of Y” (Y varies with single vs multi) |

---

## How to test

1. `pnpm dev`
2. **`/signup`** → complete account form → OTP step → **Verify & continue** → should land on **`/onboarding`** with email / store / legal name prefilled where applicable
3. Walk all onboarding steps → **Go to home**
4. Direct **`/onboarding`** — no prefill (or run signup flow again)
5. **`/forgot-password`** — request → slide to sent panel; resend cooldown; back to sign in

---

## Follow-ups

- Persist onboarding + signup to **API** / auth session
- **Real OTP** verification before `router.push`
- Map/GPS when product-ready
- Deeper branch CRUD (screens 83+) and manager assignment beyond the onboarding note

---

## Merge commit — extended description (copy for GitHub)

```text
feat: onboarding & signup → onboarding handoff

Onboarding: /onboarding wizard (Ghana regions, GHS, en-GH, no map). Core steps
plus optional multi-branch subflow, checklist, guided intros, completion.
Sticky header progress + footer nav; dynamic step list via buildOnboardingSteps.

Signup: after OTP submit, prefill sessionStorage and navigate to /onboarding.

Lib: app/lib/onboarding-prefill.ts for signup → onboarding handoff.

README: routes table. Forgot-password full UI if included in branch.
```
