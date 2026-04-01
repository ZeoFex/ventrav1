import { AccountSettingsView } from "@/app/components/dashboard/settings/account-settings-view";
import { SettingsPageShell } from "@/app/components/dashboard/settings/settings-page-shell";

export default function AccountSettingsPage() {
    return (
        <SettingsPageShell
            title="Account Settings"
            description="Manage your personal information, contact details and profile photo."
        >
            <AccountSettingsView />
        </SettingsPageShell>
    );
}
