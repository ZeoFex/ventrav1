import type { Metadata } from "next";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { SiteHeader } from "@/app/components/landing/site-header";
import { ShopMarket } from "./shop-market";

export const metadata: Metadata = {
  title: "Shop here",
  description: "Everything you need is here. Browse shops, categories, and place an order.",
};

export default function ShopPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f1ea] dark:bg-[#0c0c0c]">
      <SiteHeader />
      <main className="flex-1 pt-28">
        <ShopMarket />
      </main>
      <SiteFooter />
    </div>
  );
}
