import { HomeGreeting } from "./home-greeting";
import { HomeKpiCards } from "./home-kpi-cards";
import { HomeQuickActions } from "./home-quick-actions";
import { HomeRecentActivity } from "./home-recent-activity";

export function DashboardHomeView() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-8 sm:space-y-10">
        <div
          data-tour-target="home-greeting"
          data-tour-mount="main"
        >
          <HomeGreeting />
        </div>

        <section className="space-y-3 sm:space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Today
          </h2>
          <div
            data-tour-target="home-kpis"
            data-tour-mount="main"
          >
            <HomeKpiCards />
          </div>
        </section>

        <section className="space-y-3 sm:space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quick actions
          </h2>
          <div
            data-tour-target="home-quick-actions"
            data-tour-mount="main"
          >
            <HomeQuickActions />
          </div>
        </section>

        <HomeRecentActivity />
      </div>
    </main>
  );
}
