export const REPORTS_KPIS = {
    grossSales: 42500,
    discounts: 1200,
    netSales: 41300,
    totalCogs: 18500,
    grossProfit: 22800,
    marginPercent: 55.2,
    transactionCount: 342,
};

export const MOCK_SALES_TREND = [
    { time: "08:00", sales: 1200 },
    { time: "10:00", sales: 4500 },
    { time: "12:00", sales: 8200 },
    { time: "14:00", sales: 6000 },
    { time: "16:00", sales: 5200 },
    { time: "18:00", sales: 9500 },
    { time: "20:00", sales: 7900 },
];

export const MOCK_PAYMENT_METHODS = [
    { name: "Mobile Money", value: 18000, color: "#f59e0b" },
    { name: "Card", value: 12500, color: "#8b5cf6" },
    { name: "Cash", value: 10800, color: "#006c49" },
];

export const MOCK_TOP_ITEMS = [
    { id: "itm-1", name: "Paracetamol 500mg (Box)", category: "Pharmacy", qty: 45, revenue: 1350 },
    { id: "itm-2", name: "Grilled Tilapia Extra", category: "Restaurant", qty: 38, revenue: 3800 },
    { id: "itm-3", name: "Coca Cola 1.5L", category: "Retail", qty: 120, revenue: 1800 },
    { id: "itm-4", name: "Ibuprofen 400mg", category: "Pharmacy", qty: 30, revenue: 1200 },
    { id: "itm-5", name: "Chicken Fried Rice", category: "Restaurant", qty: 25, revenue: 1750 },
];

export const MOCK_CATEGORY_PERFORMANCE = [
    { category: "Restaurant/Food", sales: 15400, percentage: 37.3 },
    { category: "Pharmacy/Meds", sales: 12500, percentage: 30.2 },
    { category: "Retail/Groceries", sales: 13400, percentage: 32.5 },
];

export const MOCK_Z_REPORT = {
    shiftId: "SHIFT-8821",
    openedBy: "John Doe",
    openedAt: "2026-03-23T08:00:00Z",
    closedAt: "2026-03-23T17:30:00Z",
    openingBalance: 500,
    closingBalance: 4250,
    expectedCash: 4250,
    actualCash: 4245,
    discrepancy: -5,
    salesByMethod: [
        { method: "Cash", amount: 2850 },
        { method: "MoMo (MTN)", amount: 1100 },
        { method: "MoMo (Telecel)", amount: 250 },
        { method: "Card", amount: 50 },
    ]
};

export const MOCK_INVENTORY_VALUATION = {
    totalItems: 1420,
    costValue: 42500,
    retailValue: 68400,
    potentialProfit: 25900,
    marginPercent: 37.8,
    lowStockItems: [
        { id: "p1", name: "Paracetamol 500mg", stock: 12, reorder: 50 },
        { id: "p2", name: "Classic Cotton Tee (M)", stock: 3, reorder: 10 },
        { id: "p3", name: "Slim Fit Chinos", stock: 8, reorder: 15 },
    ]
};

export const MOCK_TAXES = {
    period: "March 2026",
    totalTaxableSales: 112000,
    taxBreakdown: [
        { name: "VAT (15%)", amount: 16800 },
        { name: "NHIL (2.5%)", amount: 2800 },
        { name: "GETFund (2.5%)", amount: 2800 },
        { name: "Covid-19 Levy (1%)", amount: 1120 },
    ],
    totalTax: 23520,
};
