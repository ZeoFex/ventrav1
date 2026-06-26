import { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/app/components/auth/verify-email-view";

export const metadata: Metadata = {
    title: "Verify Email",
    description: "Verify your VentraPOS account email address.",
    robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={null}>
            <VerifyEmailView />
        </Suspense>
    );
}
