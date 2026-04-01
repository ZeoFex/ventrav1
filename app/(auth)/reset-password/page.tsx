import { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordView } from "@/app/components/auth/reset-password-view";

export const metadata: Metadata = {
    title: "Reset Password",
    description: "Create a new password for your VentraPOS account.",
    robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordView />
        </Suspense>
    );
}
