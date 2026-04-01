import type { Metadata } from "next";
import { SignupView } from "@/app/components/auth/signup";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create your free VentraPOS account. Start managing sales, inventory, and staff in minutes.",
  openGraph: {
    title: "Create Account — VentraPOS",
    description: "Start your free trial. Cloud POS for supermarkets, pharmacies, and restaurants.",
  },
};

export default function SignupPage() {
  return <SignupView />;
}
