# VentraPOS Desktop v0.2.1 — Windows

**Released:** 5 May 2026

## Overview

Windows **v0.2.1** ships the latest VentraPOS web app inside the desktop shell (Electron + local Next.js standalone server). Install this build to get the newest dashboard features, fixes, and support tools bundled for offline-ready installs.

## Downloads (Windows x64)

| Artifact | Use case |
|----------|----------|
| `VentraPOS Setup 0.2.1.exe` | Full NSIS installer (recommended for most stores) |
| `VentraPOS 0.2.1.exe` | Portable build (no install; useful for testing or restricted machines) |

Installers from an earlier line (e.g. **0.2.0**) can be uninstalled or replaced by running the new setup. Your business data remains on VentraPOS services—this update refreshes the **desktop client** only.

## What’s included in this build

This release bundles a substantial platform update. Highlights for day-to-day users:

- **Help Centre** — In-app knowledge base with searchable articles and structured navigation.
- **Zuri (support chat)** — Assistant-style help in **Support** (product chrome updated from the earlier Copilot naming).
- **First-time product tour** — Driver.js guided steps on **Home** and main dashboard chrome for new users.
- **Support & Pro experience** — Reworked support area with the new chat panel and clearer flows.
- **Reliability & platform work** — Backend improvements including leaner platform stats/billing queries, safer handling of dynamic IDs, and ongoing API hardening (clearer responses and stability for integrated surfaces).

**Note for operators & integrators:** OpenAPI docs and Bearer-auth API surfaces continue to evolve; this desktop build matches the API behavior baked in at packaging time.

## Before you install

- Download only from **official** VentraPOS links (`/download` on [ventrapos.com](https://www.ventrapos.com) or links we provide).
- Windows SmartScreen may warn on new or unsigned builds—verify publisher and source if prompted.
- **Configuration:** Production desktop bundles expect server-side settings at **build** time (see repo README). Optional per-machine overrides may use the user-data `.env.local` path documented for Electron.

## Install / update

1. Download **`VentraPOS Setup 0.2.1.exe`**.
2. Quit any running VentraPOS desktop instance.
3. Run the installer and complete the wizard (custom install directory allowed when enabled).
4. Open **VentraPOS** from the Start menu or desktop shortcut.

## Version alignment

The marketing **`/download`** page shows **v0.2.1** when the site is deployed from the same `package.json` version as this installer. If the badge lags, redeploy the web app or confirm hosting env vars for the installer URL.

---

*Internal build artifacts live under `release/` after `pnpm electron:build`.*
