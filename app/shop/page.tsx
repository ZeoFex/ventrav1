import type { Metadata } from "next";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { ShopMarket } from "./shop-market";

export const metadata: Metadata = {
  title: "Shop here",
  description: "Everything you need is here. Browse shops, categories, and place an order.",
};

export default function ShopPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f1ea] lg:h-dvh lg:max-h-dvh lg:min-h-0 lg:overflow-hidden dark:bg-[#0c0c0c]">
      <main className="flex min-h-0 flex-1 flex-col pt-4 lg:overflow-hidden">
        <ShopMarket />
      </main>
      <div className="lg:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
