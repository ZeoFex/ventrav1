import type { DashboardNavIconId } from "./dashboard-nav-config";
import { DASHBOARD_NAV_ICONS } from "./dashboard-nav-icons";

const iconClass = "size-[1.35rem] shrink-0";

export function SidebarNavIcon({ id }: { id: DashboardNavIconId }) {
  const Icon = DASHBOARD_NAV_ICONS[id];
  return (
    <Icon className={iconClass} strokeWidth={1.5} aria-hidden focusable={false} />
  );
}
