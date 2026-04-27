/**
 * Gemini + AI SDK execute independent tool calls per step; we keep write tools few
 * and rely on server-side validation + audit instead of custom fan-out here.
 */
export const READ_TOOL_NAMES = new Set([
  "get_sales_summary",
  "get_merchant_analytics",
  "search_products",
  "list_low_stock",
  "get_billing_subscription_status",
  "suggest_dashboard_links",
  "search_customers",
  "get_expense_insights",
  "explain_screen",
]);

export const WRITE_TOOL_NAMES = new Set([
  "save_copilot_feedback",
  "request_sales_export",
]);
