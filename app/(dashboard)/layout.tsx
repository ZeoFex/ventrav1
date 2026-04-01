import { DashboardShell } from "@/app/components/dashboard/dashboard-shell";
import { SubscriptionGuard } from "@/app/components/dashboard/subscription-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <SubscriptionGuard>{children}</SubscriptionGuard>
    </DashboardShell>
  );
}
