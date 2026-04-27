import type { ToolSet } from "ai";
import type { CopilotScope } from "../scope";
import { billingStatusTool } from "./read/billing-status";
import { explainScreenTool } from "./read/explain-screen";
import { inventorySearchTool } from "./read/inventory-search";
import { lowStockTool } from "./read/low-stock";
import { navSuggestionsTool } from "./read/nav-suggestions";
import { salesSummaryTool } from "./read/sales-summary";
import { requestSalesExportTool } from "./write/request-export";
import { saveCopilotFeedbackTool } from "./write/save-feedback";
import { merchantAnalyticsTool } from "./read/merchant-analytics";
import { customersInsightsTool } from "./read/customers-insights";
import { expenseInsightsTool } from "./read/expense-insights";

export function buildCopilotToolSet(ctx: CopilotScope): ToolSet {
  return {
    get_sales_summary: salesSummaryTool(ctx),
    get_merchant_analytics: merchantAnalyticsTool(ctx),
    search_products: inventorySearchTool(ctx),
    list_low_stock: lowStockTool(ctx),
    get_billing_subscription_status: billingStatusTool(ctx),
    suggest_dashboard_links: navSuggestionsTool(ctx),
    search_customers: customersInsightsTool(ctx),
    get_expense_insights: expenseInsightsTool(ctx),
    explain_screen: explainScreenTool(ctx),
    save_copilot_feedback: saveCopilotFeedbackTool(ctx),
    request_sales_export: requestSalesExportTool(ctx),
  };
}
