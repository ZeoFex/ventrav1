import type { Metadata } from "next";
import { OnboardingView } from "@/app/components/onboarding";

export const metadata: Metadata = {
  title: "Set up your store — VentraPOS",
  description:
    "First-time setup for your VentraPOS business—tailored for Ghana (GHS, regions, receipts).",
};

export default function OnboardingPage() {
  return <OnboardingView />;
}
