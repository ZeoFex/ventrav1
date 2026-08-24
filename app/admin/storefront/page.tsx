import type { Metadata } from "next";
import { AdminStorefrontClient } from "./admin-storefront-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ventra Market — Admin preview",
    description: "Private ecommerce preview for platform admins. Not listed on the public site.",
    robots: { index: false, follow: false },
};

export default function AdminStorefrontPage() {
    return <AdminStorefrontClient />;
}
