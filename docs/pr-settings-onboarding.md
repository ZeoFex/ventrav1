# PR Content: Settings Hub & Onboarding Engine Optimization

## Summary
This PR introduces the comprehensive Settings module to VentraPOS, serving as the central hub for managing business profiles, exact tax protocols, and notification preferences. Concurrently, the onboarding flow has been significantly enhanced to provide a more streamlined and precise first-time setup experience for West African merchants.

## Key Features

### 1. Unified Settings Module
- **Business Profile**: Form to manage identity, legal names, operating locations, and upload business logos.
- **System Notifications**: Distinct toggles for Email alerts (Z-Reports, Inventory levels) vs. In-App actionable alerts (Refund approvals, hardware drops).
- **Receipt & Tax Engine**: 
  - Define custom receipt headers/footers.
  - Implement system-wide flat tax rates mapped specifically to Ghana Revenue Authority (GRA) compliance (VAT: 15%, NHIL: 2.5%, GETFund: 2.5%, Covid-19: 1%).
  - **WYSIWYG Receipt Editor**: Directly embedded the `ReceiptThermalPreview` component into the settings page to render real-time UI updates to the 58mm thermal receipt as header, footer, or tax values are edited.

### 2. Onboarding Flow Evolutions
- **Intelligent Routing**: Upon finalizing store setup, users are instantly dropped into `/dashboard` rather than the public landing page, accelerating the "time to first value."
- **Granular Weekly Scheduling**: Deprecated the simplistic global open/close time constraint. The setup flow now features an interactive Monday–Sunday visual calendar, allowing merchants to toggle individual days and define precise operating windows (e.g., closing earlier on Saturdays, completely dark on Sundays).
- **Tax Pre-conditioning**: Updated the onboarding "Money & Tax" language to educate merchants on standard GRA compliance right from the start.

### 3. Navigation Cleanups
- Temporarily disabled the "Refunds & voids" Sub-nav route pending external SME consultation to ensure the optimal authorization and logging flow is built.

## Technical Changes
- Upgraded `OnboardingData` type signature to heavily rely on a nested `WeeklySchedule` object.
- Re-architected `SettingsReceiptView` to utilize fully controlled React state linked directly to the thermal preview generator.
- Added strict checklist validation to accommodate the new 7-day schedule arrays.

## Verification
- [x] Tested real-time updates within the Thermal Receipt Preview while editing settings.
- [x] Navigated through the entire onboarding flow to ensure the new `schedule` object commits to state correctly.
- [x] Verified post-onboarding drops directly to `/dashboard`.

---
*VentraPOS Core System*
