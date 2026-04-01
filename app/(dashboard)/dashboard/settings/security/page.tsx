import { SecuritySettingsView } from "@/app/components/dashboard/settings/security-settings-view";
import { SettingsPageShell } from "@/app/components/dashboard/settings/settings-page-shell";

export default function SecuritySettingsPage() {
    return (
        <SettingsPageShell
            title="Security & Login"
            description="Protect your account with password management and two-factor authentication."
        >
            <SecuritySettingsView />
        </SettingsPageShell>
    );
}
