import type { Metadata } from "next";
import { CatalogAdminClient } from "./catalog-admin-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Platform Admin — VentraPOS",
    description:
        "Manage shops, subscriptions, product catalog, and platform operations across all VentraPOS tenants.",
    robots: { index: false, follow: false },
};

export default function MasterCatalogAdminPage() {
    return <CatalogAdminClient />;
}
