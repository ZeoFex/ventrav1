# PR Content: Advanced Financial Reporting & SME Analytics Suite

## Summary
This PR introduces a comprehensive financial reporting and analytics ecosystem tailored for SMEs, including multi-sector businesses like pharmacies, restaurants, and retail stores. It features a complete Report Center, advanced cash reconciliation (Z-Reports), inventory valuation, and a universal "drill-down" navigation system across the entire dashboard.

## Key Features

### 1. Robust Report Center
- **Sales Summary**: High-level overview of gross/net sales, profit margins, and top-performing items with fluid visualizations.
- **End of Day (Z-Report)**: Automated shift closure logic that reconciles expected drawer values against actual cash counts, including discrepancy logging and payment method splits (Cash, MoMo, Card).
- **Inventory Valuation**: Strategic analysis of tied-up capital showing "Total Cost" vs. "Retail Worth" and real-time "Low Stock Alerts" for proactive procurement.
- **Tax Liabilities**: Specialized report for Ghana Revenue Authority (GRA) compliance, breaking down VAT (15%), NHIL (2.5%), GETFund (2.5%), and Covid-19 levies from taxable sales.

### 2. High-Density Detail Views (Drill-downs)
- Created dedicated, interactive detail pages for core KPIs:
  - **Revenue Analysis**: Temporal trends and channel-specific intake (POS vs Online).
  - **Transaction Logs**: Searchable, high-performance logs for auditing every receipt.
  - **Profitability Metrics**: Granular breakdown of Revenue vs. COGS at the category level.
  - **AOV (Average Order Value)**: Insights and data on order sizes to drive growth strategies.

### 3. Universal Connectivity & UX Polish
- **Interactive Metrics**: Linked KPI cards across the **Home Dashboard**, **Sales Overview**, and **Finance/Reports** modules to the new detail views for a seamless "summary-to-detail" workflow.
- **Premium Aesthetics**: 
  - Harmonized brand-tinted icon backgrounds with muted `0.08` opacity for a professional, balanced look.
  - Optimized KPI layouts and font sizes to prevent text truncation on high-value currency strings.
  - Added subtle micro-animations (lift effects) to interactive cards.

## Technical Changes
- **Shared Layouts**: Introduced `SalesDetailLayout` and `ProductsPageShell` integrations for consistent header and sub-navigation.
- **Mock Data Engine**: Expanded `reports-mock-data.ts` and `sales-mock-data.ts` to simulate complex business scenarios for all reporting states.
- **Responsive Design**: All new views are fully optimized for standard desktops with multi-column support for high-resolution SME analytics.

## Verification
- [x] Verified all drill-down links from Home, Sales, and Finance modules.
- [x] Tested cash reconciliation logic in the Z-Report view with mock discrepancies.
- [x] Confirmed responsive behavior of the 6-column KPI grid in the Sales Summary.
- [x] Validated dark mode consistency across all new reporting components.

