"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Store,
    ArrowRight,
    Wallet,
    History,
    Monitor,
    CheckCircle2,
    AlertCircle
} from "lucide-react";

const REGISTERS = [
    { id: "reg-1", name: "Main Counter (Register 1)", status: "closed" },
    { id: "reg-2", name: "Back Counter (Register 2)", status: "closed" },
    { id: "reg-mobile", name: "Mobile Terminal 1", status: "closed" },
];

const LAST_SHIFT = {
    closedAt: "Yesterday, 9:24 PM",
    closedBy: "Kojo Mensah",
    closingAmount: 1450.50,
};

export function RegisterOpenView() {
    const router = useRouter();
    const [selectedRegister, setSelectedRegister] = useState(REGISTERS[0]!.id);
    const [openingFloat, setOpeningFloat] = useState("0.00");
    const [isOpening, setIsOpening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOpenRegister = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(openingFloat);

        if (isNaN(amount) || amount < 0) {
            setError("Please enter a valid opening float amount.");
            return;
        }

        setIsOpening(true);
        setError(null);

        // Simulate API call
        setTimeout(() => {
            setIsOpening(false);
            router.push("/dashboard/pos/sale");
        }, 1200);
    };

    return (
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
            <div className="mb-10 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                    <Store className="size-8" strokeWidth={1.5} />
                </div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
                    Open Register
                </h1>
                <p className="mt-2 text-[16px] text-muted-foreground">
                    Select a register and provide the starting float to begin your shift.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3 space-y-6">
                    <form onSubmit={handleOpenRegister} className="rounded-[2rem] border border-[#eef0f2] bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#111]">
                        <div className="space-y-6">
                            {/* Register Selection */}
                            <div className="space-y-3">
                                <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                    Select Register
                                </label>
                                <div className="grid gap-3">
                                    {REGISTERS.map((reg) => (
                                        <button
                                            key={reg.id}
                                            type="button"
                                            onClick={() => setSelectedRegister(reg.id)}
                                            className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${selectedRegister === reg.id
                                                    ? "border-[#006c49] bg-[#006c49]/5 ring-1 ring-[#006c49] dark:border-[#6ffbbe] dark:bg-[#6ffbbe]/5 dark:ring-[#6ffbbe]"
                                                    : "border-[#f0f2f4] bg-white hover:border-[#e5e7eb] dark:border-white/5 dark:bg-[#141414] dark:hover:border-white/10"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`rounded-full p-2 ${selectedRegister === reg.id ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-black" : "bg-[#f4f5f7] text-muted-foreground dark:bg-white/5"
                                                    }`}>
                                                    <Monitor className="size-4" />
                                                </div>
                                                <span className={`text-[15px] font-medium ${selectedRegister === reg.id ? "text-foreground" : "text-muted-foreground"}`}>
                                                    {reg.name}
                                                </span>
                                            </div>
                                            {selectedRegister === reg.id && (
                                                <CheckCircle2 className="size-5 text-[#006c49] dark:text-[#6ffbbe]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Opening Float Input */}
                            <div className="space-y-3">
                                <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                    Opening Float (GHS)
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                        GHS
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={openingFloat}
                                        onChange={(e) => setOpeningFloat(e.target.value)}
                                        className="w-full rounded-2xl border border-[#e5e7eb] bg-white py-4 pl-14 pr-4 text-xl font-bold tracking-tight outline-none ring-[#006c49]/20 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.12] dark:bg-[#141414] dark:ring-[#6ffbbe]/10"
                                        placeholder="0.00"
                                    />
                                    <Wallet className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground/40" />
                                </div>
                                <p className="text-[13px] text-muted-foreground ml-1">
                                    Enter the total cash amount currently in the drawer.
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                    <p className="text-[13px] leading-relaxed">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isOpening}
                                className="group w-full rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-5 text-[16px] font-bold text-white shadow-xl transition-all hover:brightness-110 disabled:opacity-50 disabled:grayscale"
                            >
                                {isOpening ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="size-5 animate-spin text-white/50" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Opening Register...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Open Register & Start Shift
                                        <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-[2rem] border border-[#f0f2f4] bg-[#fafafa] p-6 dark:border-white/[0.04] dark:bg-white/[0.02]">
                        <h2 className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wider text-muted-foreground mb-6">
                            <History className="size-4" />
                            Last Shift Summary
                        </h2>

                        <div className="space-y-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[13px] text-muted-foreground">Closed At</p>
                                    <p className="text-[15px] font-medium text-foreground">{LAST_SHIFT.closedAt}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[13px] text-muted-foreground">Closed By</p>
                                    <p className="text-[15px] font-medium text-foreground">{LAST_SHIFT.closedBy}</p>
                                </div>
                            </div>

                            <div className="pt-5 border-t border-[#eef0f2] dark:border-white/[0.06]">
                                <p className="text-[13px] text-muted-foreground mb-1">Expected Closing Cash</p>
                                <p className="text-2xl font-bold tracking-tight text-foreground">
                                    GHS {LAST_SHIFT.closingAmount.toFixed(2)}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-[#006c49]/5 p-4 dark:bg-[#6ffbbe]/5">
                                <p className="text-[13px] text-[#006c49] dark:text-[#6ffbbe] leading-relaxed">
                                    Tip: Ensure the drawer is physically counted before opening the shift to maintain accurate audit trails.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-[#f0f2f4] bg-white p-6 dark:border-white/[0.04] dark:bg-[#111]">
                        <h3 className="text-[15px] font-semibold mb-3">POS Guidelines</h3>
                        <ul className="space-y-3 text-[13px] text-muted-foreground">
                            <li className="flex gap-3">
                                <div className="mt-1 flex size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                                Accurately record all cash drop-ins and payouts during the shift.
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 flex size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                                Use the "Hold Sale" feature for customers still shopping.
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-1 flex size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                                End of day reports will be generated upon closing the shift.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
