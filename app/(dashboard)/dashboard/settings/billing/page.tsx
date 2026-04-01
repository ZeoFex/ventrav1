import { BillingSettingsView } from "@/app/components/dashboard/settings/billing-settings-view";
import { SettingsPageShell } from "@/app/components/dashboard/settings/settings-page-shell";

export default function BillingSettingsPage() {
    return (
        <SettingsPageShell
            title="Billing & Subscription"
            description="Manage your plan, payment methods, and view your billing history."
        >
            <BillingSettingsView />
        </SettingsPageShell>
    );
}
