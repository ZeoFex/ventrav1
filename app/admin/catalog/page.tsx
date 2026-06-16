import type { Metadata } from "next";
import { CatalogAdminClient } from "./catalog-admin-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Master Product Catalog — VentraPOS Admin",
    description:
        "Centralized product catalog grouped by shop type and category. Aggregated from tenant inventories.",
    robots: { index: false, follow: false },
};

export default function MasterCatalogAdminPage() {
    return <CatalogAdminClient />;
}
