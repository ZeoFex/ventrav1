import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminLoginClient } from "./admin-login-client";

/** Dev-only smoke page; avoid shipping to hosted production/preview builds (NODE_ENV=production). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Superadmin login (API check)",
  description: "Minimal superadmin login and platform listing for API verification.",
  robots: { index: false, follow: false },
};

export default function AdminLoginSmokePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <AdminLoginClient />;
}
