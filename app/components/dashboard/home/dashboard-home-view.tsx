import { HomeGreeting } from "./home-greeting";
import { HomeOwnerAlerts } from "./home-owner-alerts";
import { HomeMobileHub } from "./home-mobile-hub";
import { HomeKpiCards } from "./home-kpi-cards";
import { HomeQuickSaleProducts } from "./home-quick-sale-products";
import { HomeProductGrid } from "./home-product-grid";

export function DashboardHomeView() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-4 pb-8 sm:px-6 sm:py-10 sm:pb-10">
      <div className="space-y-6 sm:space-y-8 lg:space-y-10">
        <div data-tour-target="home-greeting" data-tour-mount="main">
          <HomeGreeting />
        </div>

        <HomeOwnerAlerts />

        <HomeMobileHub />

        <section className="hidden space-y-3 sm:space-y-4 lg:block">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Today
          </h2>
          <div data-tour-target="home-kpis" data-tour-mount="main">
            <HomeKpiCards />
          </div>
        </section>

        <HomeQuickSaleProducts />

        <HomeProductGrid />
      </div>
    </main>
  );
}
