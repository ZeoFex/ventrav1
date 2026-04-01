"use client";

import { Shield, Key, Smartphone, AlertTriangle, CheckCircle2 } from "lucide-react";

export function SecuritySettingsView() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Change Password */}
            <div className="rounded-[2rem] border border-[#eef0f2] bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#111]">
                <div className="flex items-center gap-3 mb-8">
                    <div className="rounded-2xl bg-[#006c49]/5 p-3 dark:bg-[#6ffbbe]/5">
                        <Key className="size-5 text-[#006c49] dark:text-[#6ffbbe]" />
                    </div>
                    <div>
                        <h3 className="text-[18px] font-semibold tracking-tight">Security & Password</h3>
                        <p className="text-[13px] text-muted-foreground">Update your password to keep your account secure.</p>
                    </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Current Password</label>
                        <input
                            type="password"
                            className="w-full rounded-2xl border border-[#e5e7eb] bg-transparent py-3 px-4 text-[15px] outline-none ring-[#006c49]/15 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="hidden sm:block" />
                    <div className="space-y-2">
                        <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">New Password</label>
                        <input
                            type="password"
                            className="w-full rounded-2xl border border-[#e5e7eb] bg-transparent py-3 px-4 text-[15px] outline-none ring-[#006c49]/15 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Confirm New Password</label>
                        <input
                            type="password"
                            className="w-full rounded-2xl border border-[#e5e7eb] bg-transparent py-3 px-4 text-[15px] outline-none ring-[#006c49]/15 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button className="flex items-center gap-2 rounded-xl bg-[#006c49] px-6 py-3 text-[14px] font-bold text-white shadow-xl shadow-[#006c49]/20 transition-all hover:brightness-110">
                        Update Password
                    </button>
                </div>
            </div>

            {/* Two Factor Auth */}
            <div className="rounded-[2rem] border border-[#eef0f2] bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#111]">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-[#006c49]/5 p-3 dark:bg-[#6ffbbe]/5 mt-1">
                            <Smartphone className="size-5 text-[#006c49] dark:text-[#6ffbbe]" />
                        </div>
                        <div>
                            <h3 className="text-[16px] font-semibold tracking-tight">Two-Factor Authentication (2FA)</h3>
                            <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed max-w-md">
                                Add an extra layer of security to your account. We'll ask for a code whenever you log in from a new device.
                            </p>
                        </div>
                    </div>
                    <button className="rounded-xl border border-[#eef0f2] px-4 py-2 text-[13px] font-semibold hover:bg-[#fafafa] dark:border-white/10 dark:hover:bg-white/5 transition-colors">
                        Setup 2FA
                    </button>
                </div>
            </div>

            {/* Account Deletion / Danger Zone */}
            <div className="rounded-[2rem] border border-red-100 bg-red-50/30 p-8 dark:border-red-900/30 dark:bg-red-900/10">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-red-100 p-3 dark:bg-red-900/40">
                        <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-[16px] font-semibold text-red-900 dark:text-red-400">Danger Zone</h3>
                        <p className="mt-1 text-[14px] text-red-700/80 dark:text-red-400/60 max-w-md">
                            Permanently delete your personal account and all associated data. This action cannot be undone.
                        </p>
                        <button className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
