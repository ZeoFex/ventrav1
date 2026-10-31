import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { CustomerHome } from "./customer-home";

export const metadata: Metadata = {
  title: "Your account",
  description: "See your orders, messages, notifications, and account settings.",
};

export default function CustomerPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f1ea] dark:bg-[#0c0c0c]">
      <main className="flex-1 pt-4">
        <Suspense fallback={<p className="py-16 text-center text-sm text-[#8a8478]">Loading your account…</p>}>
          <CustomerHome />
        </Suspense>
      </main>
      <div className="hidden lg:block">
        <SiteFooter />
      </div>
    </div>
  );
}
