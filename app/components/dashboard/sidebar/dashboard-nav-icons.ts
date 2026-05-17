import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  BookUser,
  Home,
  Landmark,
  Package,
  Receipt,
  Settings,
  SquareTerminal,
  UsersRound,
  Megaphone,
} from "lucide-react";
import type { DashboardNavIconId } from "./dashboard-nav-config";

/** Lucide icons for each top-level nav id — single source of truth. */
export const DASHBOARD_NAV_ICONS: Record<DashboardNavIconId, LucideIcon> = {
  home: Home,
  pos: SquareTerminal,
  sales: Receipt,
  products: Package,
  contacts: BookUser,
  staff: UsersRound,
  finance: Landmark,
  branches: Building2,
  reports: BarChart3,
  marketing: Megaphone,
  settings: Settings,
};
