import type { Metadata } from "next";
import { LoginView } from "@/app/components/auth/login";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your VentraPOS account. Manage sales, inventory, and staff — all from one place.",
  openGraph: {
    title: "Sign In — VentraPOS",
    description: "Access your store dashboard. Cloud POS for growing retailers.",
  },
};

type LoginPageProps = {
  searchParams: Promise<{ as?: string; create?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return (
    <LoginView
      initialType={params.as === "customer" ? "customer" : "owner"}
      startCreating={params.as === "customer" && params.create === "1"}
      nextPath={params.next === "/shop" ? "/shop" : ""}
    />
  );
}
