"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Receipt, Calculator, Loader2 } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { ReceiptThermalPreview } from "@/app/components/onboarding/receipt-thermal-preview";
import { defaultOnboardingData } from "@/app/components/onboarding/types";
import { useBusinessProfile } from "./settings-data-hooks";

export function SettingsReceiptView() {
    const { business, isLoading, mutate } = useBusinessProfile();
    const [isSaving, setIsSaving] = useState(false);

    // Receipt state
    const [headerText, setHeaderText] = useState("");
    const [footerText, setFooterText] = useState("");

    // Tax state
    const [taxRegistered, setTaxRegistered] = useState(false);
    const [taxRate, setTaxRate] = useState("0");

    useEffect(() => {
        if (business) {
            setHeaderText(business.receiptHeader || "");
            setFooterText(business.receiptFooter || "");
            setTaxRegistered(business.taxRegistered || false);
            setTaxRate(business.taxRate || "0");
        }
    }, [business]);

    async function handleSave() {
        setIsSaving(true);
        try {
            const res = await fetch("/api/business", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiptHeader: headerText,
                    receiptFooter: footerText,
                    taxRegistered,
                    taxRate,
                }),
            });
            if (res.ok) {
                mutate();
                alert("Settings updated successfully!");
            } else {
                alert("Failed to update settings.");
            }
        } catch (err) {
            alert("Error saving changes.");
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground opacity-20" />
            </div>
        );
    }

    const mockData = {
        ...defaultOnboardingData(),
        storeName: business?.name || "VentraPOS",
        receiptHeader: headerText,
        receiptFooter: footerText,
        taxRegistered,
        taxRate,
    };

    return (
        <ProductsPageShell
            title="Receipt & Tax Settings"
            description="Customize your receipt formats and configure global tax and levy rates."
            actions={
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:brightness-105 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        {isSaving ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            }
        >
            <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
                <div className="space-y-6">
                    {/* RECEIPT CONFIGURATION */}
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-[#006c49]/05 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                <Receipt className="size-5" />
                            </div>
                            <h3 className="font-semibold text-foreground">Receipt Preferences</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground">Header Text (prints below logo)</label>
                                <textarea value={headerText} onChange={(e) => setHeaderText(e.target.value)} rows={2} className="w-full rounded-xl border border-[#eef0f2] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground">Footer Text (Terms or Thank You message)</label>
                                <textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={3} className="w-full rounded-xl border border-[#eef0f2] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]" />
                            </div>
                        </div>
                    </div>

                    {/* TAX CONFIGURATION */}
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                                    <Calculator className="size-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Global Tax Rate</h3>
                                    <p className="text-[12px] text-muted-foreground">Applied to all taxable items in the POS.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input type="checkbox" checked={taxRegistered} onChange={(e) => setTaxRegistered(e.target.checked)} className="peer sr-only" />
                                <div className="peer h-6 w-11 rounded-full bg-muted/30 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-zinc-700"></div>
                            </label>
                        </div>
                        <div className={`grid gap-4 sm:grid-cols-2 transition-opacity ${taxRegistered ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-[13px] font-medium text-muted-foreground">Cumulative Tax Rate (%)</label>
                                <input
                                    type="number"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value)}
                                    step="0.1"
                                    className="w-full rounded-xl border border-[#eef0f2] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-amber-500 dark:border-white/[0.12]"
                                />
                                <p className="text-[11px] text-muted-foreground mt-1">Enter the total percentage to be added to sale subtotals.</p>
                            </div>
                        </div>
                        <div className="mt-6 rounded-xl bg-amber-500/05 p-4 border border-amber-500/20">
                            <p className="text-[12px] text-amber-600 dark:text-amber-500/80">
                                Note: For Ghana businesses, ensure your tax rate includes VAT and all statutory levies (NHIL, GETFund, Covid-19) as per GRA guidelines.
                            </p>
                        </div>
                    </div>
                </div>

                {/* THERMAL RECEIPT PREVIEW */}
                <div className="flex flex-col justify-start lg:sticky lg:top-24 items-center">
                    <ReceiptThermalPreview data={mockData} />
                </div>
            </div>
        </ProductsPageShell>
    );
}
