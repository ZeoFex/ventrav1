import { Suspense } from "react";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getDashboardHomeData } from "@/server/pos/pos-service";
import { DashboardHomeView } from "@/app/components/dashboard/home/dashboard-home-view";
import { DashboardHomeSWRProvider } from "@/app/components/dashboard/home/dashboard-home-provider";
import { Skeleton } from "@/app/components/dashboard/ui/skeleton";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function DashboardPage({ params }: PageProps) {
  const { slug } = await params;
  const segments = slug ?? [];

  if (segments.length === 0) {
    return (
      <Suspense fallback={<DashboardHomeSkeleton />}>
        <DashboardHomeDataWrapper />
      </Suspense>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-[15px] text-muted-foreground">
        This section is coming soon.
      </p>
    </main>
  );
}

/** Pre-fetches dashboard data without blocking the initial shell render. */
async function DashboardHomeDataWrapper() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

  let fallbackData = null;
  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      // This await only blocks THIS Suspense boundary, not the whole page shell.
      fallbackData = await getDashboardHomeData(payload.bid);
    } catch (e) {
      console.error("Failed to prefetch dashboard home:", e);
    }
  }

  return (
    <DashboardHomeSWRProvider fallback={{ "/api/dashboard/home": fallbackData }}>
      <DashboardHomeView />
    </DashboardHomeSWRProvider>
  );
}

function DashboardHomeSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-8 sm:space-y-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        <section className="space-y-3 sm:space-y-4">
          <Skeleton className="h-4 w-20" />
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </section>

        <section className="space-y-3 sm:space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </section>

        <div className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="border-b border-border/50 px-4 py-3 sm:px-5">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-4 p-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
