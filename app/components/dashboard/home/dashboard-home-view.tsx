import { HomeGreeting } from "./home-greeting";
import { HomeOwnerAlerts } from "./home-owner-alerts";
import { HomeDailySales } from "./home-daily-sales";
import { HomeQuickSaleProducts } from "./home-quick-sale-products";
import { HomeProductGrid } from "./home-product-grid";
import { HomeMobileStorefront } from "./home-mobile-storefront";

export function DashboardHomeView() {
  return (
    <>
      {/* Mobile: Walmart-style storefront, VentraPOS theme */}
      <div className="lg:hidden">
        <HomeMobileStorefront />
      </div>

      {/* Desktop: original dashboard home */}
      <main className="mx-auto hidden max-w-5xl px-4 py-4 pb-8 sm:px-6 sm:py-10 sm:pb-10 lg:block">
        <div className="space-y-6 sm:space-y-8 lg:space-y-10">
          <div data-tour-target="home-greeting" data-tour-mount="main">
            <HomeGreeting />
          </div>

          <HomeOwnerAlerts />

          <section className="space-y-3 sm:space-y-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Today
            </h2>
            <div data-tour-target="home-kpis" data-tour-mount="main">
              <HomeDailySales variant="cards" />
            </div>
          </section>

          <HomeQuickSaleProducts />

          <HomeProductGrid />
        </div>
      </main>
    </>
  );
}
