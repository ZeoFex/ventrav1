import type { Metadata } from "next";
import { ForgotPasswordView } from "@/app/components/auth/forgot-password";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your VentraPOS account password. We'll send a secure link to your email.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
