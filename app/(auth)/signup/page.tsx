import type { Metadata } from "next";
import { SignupView } from "@/app/components/auth/signup";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create your VentraPOS account. Choose Starter free forever, or start a Growth or Pro trial.",
  openGraph: {
    title: "Create Account — VentraPOS",
    description:
      "Select a plan and create your account. Starter is free forever; Growth and Pro include a 14-day trial.",
  },
};

export default function SignupPage() {
  return <SignupView />;
}
