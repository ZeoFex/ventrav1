import { describe, expect, it } from "vitest";
import { buildCopilotToolSet } from "../registry";
import type { CopilotScope } from "../../scope";

const mockScope: CopilotScope = {
  userId: "u1",
  businessId: "b1",
  role: "owner",
  permissions: [],
  branchId: null,
  pathname: "/dashboard",
};

describe("buildCopilotToolSet", () => {
  it("registers expected read and write tools", () => {
    const tools = buildCopilotToolSet(mockScope);
    expect(Object.keys(tools).sort()).toEqual(
      [
        "explain_screen",
        "get_billing_subscription_status",
        "get_sales_summary",
        "list_low_stock",
        "request_sales_export",
        "save_copilot_feedback",
        "search_products",
        "suggest_dashboard_links",
      ].sort(),
    );
  });
});
