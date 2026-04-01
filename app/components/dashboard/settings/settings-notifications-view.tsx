"use client";

import Link from "next/link";
import { ArrowLeft, Save, Bell, Mail, Smartphone } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";

export function SettingsNotificationsView() {
    return (
        <ProductsPageShell
            title="Notifications & Alerts"
            description="Manage how VentraPOS communicates critical system events to you and your team."
            actions={
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <button className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:brightness-105">
                        <Save className="size-4" />
                        Save Preferences
                    </button>
                </div>
            }
        >
            <div className="mx-auto max-w-3xl space-y-6">
                {/* Email Alerts */}
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <div className="mb-6 flex items-center gap-3 border-b border-[#f0f2f4] pb-4 dark:border-white/[0.04]">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                            <Mail className="size-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Email Notifications</h3>
                            <p className="text-[12px] text-muted-foreground">Sent to admin@ventrapos.com</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <NotificationToggle
                            title="End of Shift Summary (Z-Report)"
                            description="Receive a breakdown of sales and discrepancies when a register is closed."
                            defaultChecked
                        />
                        <NotificationToggle
                            title="Daily Sales Report"
                            description="A consolidated report sent every night at 11:59 PM."
                            defaultChecked
                        />
                        <NotificationToggle
                            title="Critical Inventory Alerts"
                            description="Immediate email when an item hits its designated reorder level."
                            defaultChecked
                        />
                        <NotificationToggle
                            title="New Staff Login (Unknown IP)"
                            description="Security alert for unusual login geography."
                            defaultChecked={false}
                        />
                    </div>
                </div>

                {/* Push / App Alerts */}
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <div className="mb-6 flex items-center gap-3 border-b border-[#f0f2f4] pb-4 dark:border-white/[0.04]">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                            <Bell className="size-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">In-App Alerts</h3>
                            <p className="text-[12px] text-muted-foreground">Displayed as unread badges within the dashboard.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <NotificationToggle
                            title="Refund Approvals"
                            description="Alert managers when a cashier requests a high-value void."
                            defaultChecked
                        />
                        <NotificationToggle
                            title="Hardware Connection Drop"
                            description="Notify when a receipt printer or card terminal disconnects."
                            defaultChecked
                        />
                        <NotificationToggle
                            title="System Updates"
                            description="Announcements about new VentraPOS features and maintenance."
                            defaultChecked
                        />
                    </div>
                </div>
            </div>
        </ProductsPageShell>
    );
}

function NotificationToggle({ title, description, defaultChecked }: { title: string; description: string; defaultChecked?: boolean }) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="pr-4">
                <p className="text-[14px] font-medium text-foreground">{title}</p>
                <p className="text-[12px] text-muted-foreground">{description}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center shrink-0">
                <input type="checkbox" className="peer sr-only" defaultChecked={defaultChecked} />
                <div className="peer h-6 w-11 rounded-full bg-muted/30 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#006c49] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-zinc-700 dark:peer-checked:bg-[#6ffbbe]"></div>
            </label>
        </div>
    )
}
