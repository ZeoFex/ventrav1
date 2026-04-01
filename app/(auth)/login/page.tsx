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

export default function LoginPage() {
  return <LoginView />;
}
