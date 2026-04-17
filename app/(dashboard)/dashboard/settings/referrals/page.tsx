import { ReferralsSettingsView } from "@/app/components/dashboard/settings/referrals-settings-view";
import { SettingsPageShell } from "@/app/components/dashboard/settings/settings-page-shell";

export default function ReferralsSettingsPage() {
    return (
        <SettingsPageShell
            title="Referrals"
            description="Share your link, track qualified sign-ups, and claim subscription discounts."
        >
            <ReferralsSettingsView />
        </SettingsPageShell>
    );
}
