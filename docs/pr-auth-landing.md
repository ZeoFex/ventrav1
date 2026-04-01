# PR: feat: signup, login, otp, landing

**Branch:** `Auth` → `main`  
**Scope:** Initial VentraPOS marketing landing, auth UI (signup with OTP step, login, forgot-password placeholder), theming, and design docs.

---

## Summary

Introduces the **VentraPOS** marketing landing, **auth flows** (sign up with OTP step, sign in, forgot-password placeholder), **light/dark theming**, and **design documentation**—all on **Next.js App Router** with a clear `(auth)` route group and split `signup` / `login` component folders.

---

## What’s included

### Landing (`/`)

- Marketing layout with **hero**, **floating site header** (Sign in / Get started), and **dashboard preview** imagery (`public/hero-dashboard.png`).
- Styling aligned with **Financial Atelier** / VentraPOS tokens (see `DESIGN.md`, `app/globals.css`).

### Auth routing & architecture

- **Route group** `app/(auth)/` — URLs stay clean (`/signup`, `/login`, `/forgot-password`); the group only organizes code.
- **`app/(auth)/layout.tsx`** — thin wrapper (ready for shared auth layout later).
- **Pages:** `signup/page.tsx`, `login/page.tsx`, `forgot-password/page.tsx`.

### Sign up (`/signup`)

- **Step 1 — account:** business name, name, email, password + confirm, progressive **password rules** (length, upper/lower, number, special) with checklist that **folds** when all rules pass, terms + privacy links, **Create account** → step 2.
- **Step 2 — OTP:** horizontal **slide** between account panel and OTP panel; **6-digit OTP** with paste, **resend cooldown** (30s), verify CTA, back to account details.
- **Split visuals:** order screenshots (`order-light` / `order-pos`) and security art (`security-light` / `security-dark`) with `AuthSplitVisual` (theme-aware images).
- **Components:** `app/components/auth/signup/` — `signup-view.tsx`, `signup-account-form.tsx`, `signup-otp-form.tsx`, barrel `index.ts`.

### Sign in (`/login`)

- **LoginView** + **LoginForm:** email, password, show/hide, **Remember this device**, **Forgot password?** → `/forgot-password`, link to **Create one** → `/signup`.
- Same **split visual** pattern as signup (consistent marketing side panel).

### Forgot password (`/forgot-password`)

- Full flow: **request email** (split visual + form) → slide to **“Link sent”** panel (security visual, masked email, resend cooldown, different email, back to sign in). APIs **TODO** (`forgot-password-view.tsx`).
- Components: `app/components/auth/forgot-password/` — `forgot-password-view.tsx`, `forgot-password-request-form.tsx`, `forgot-password-sent-panel.tsx`, barrel `index.ts`.

### Shared auth UI

- `auth-split-visual.tsx` — logo, subtitle, light/dark `next/image` pairs.
- `auth-icons.tsx`, `auth-input-classes.ts` — shared field styling and icons.
- `resend-verification-view.tsx` — prepared for a future resend-email route (not wired to a page in this PR).

### Theming

- `ThemeProvider` + **`ThemeToggle`** on auth screens (and applicable landing areas).
- CSS variables for **light/dark** surfaces and green accent usage on CTAs.

### Tooling & docs

- **Next.js 16**, React 19, TypeScript, ESLint, Tailwind v4 (per `package.json` / lockfile).
- **`DESIGN.md`**, **`.cursor/rules/`** (`about.mdc`, `design-system.mdc`, `screens.mdc`), `aboutventra.md` for product/design context.

### Assets

- `public/hero-dashboard.png`, `public/landing/*` (orders, security, ventra brand art), default Next/public SVGs.

---

## Technical notes

| Area | Detail |
|------|--------|
| Router | App Router; `(auth)` is a **non-segment** group |
| Client state | Signup OTP + slider: `"use client"` in `signup-view` |
| Barrel exports | `@/app/components/auth/signup`, `@/app/components/auth/login` |
| APIs | Sign-in, OTP verify, and resend marked **TODO** in components (UI-only) |

---

## How to test

1. `pnpm install` (or `npm install`)
2. `pnpm dev` — open `/`, `/signup`, `/login`, `/forgot-password`
3. **Signup:** fill form → password rules → submit → OTP panel slides; resend cooldown; back link
4. **Login:** toggle theme; forgot link; navigate to signup
5. **Responsive:** split layout stacks on small viewports

---

## Follow-ups (out of scope for this PR)

- Wire **auth API** (sign-in, signup, OTP verify, resend).
- **Forgot password** email/API and dedicated flow.
- Route for **resend verification** using `resend-verification-view.tsx`.
- E2E or integration tests once APIs exist.

---

## Screenshots

_Add before/after or key screens (landing, signup account + OTP, login) for easier review._

---
