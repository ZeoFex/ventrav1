"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Upload, Store, Loader2, Image as ImageIcon } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useBusinessProfile } from "./settings-data-hooks";
import { UploadButton } from "@/app/utils/uploadthing";
import { toast } from "sonner";

export function SettingsProfileView() {
    const { business, isLoading, mutate } = useBusinessProfile();
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        businessType: "",
        contactEmail: "",
        phone: "",
        address: "",
    });

    useEffect(() => {
        if (business) {
            setFormData({
                name: business.name || "",
                businessType: business.businessType || "Retail & Grocery",
                contactEmail: business.contactEmail || "",
                phone: business.phone || "",
                address: business.address || "",
            });
        }
    }, [business]);

    async function handleSave() {
        setIsSaving(true);
        try {
            const res = await fetch("/api/business", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                mutate();
                toast.success("Profile updated successfully!");
            } else {
                toast.error("Failed to update profile.");
            }
        } catch (err) {
            toast.error("Error saving changes.");
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

    return (
        <ProductsPageShell
            title="Business Profile"
            description="Manage your company details and public information."
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
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            }
        >
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                <div className="space-y-6">
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-semibold text-foreground">General Information</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground">Business Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full rounded-xl border border-[#eef0f2] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground">Business Type</label>
                                <select
                                    value={formData.businessType}
                                    onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                                    className="w-full rounded-xl border border-[#eef0f2] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                >
                                    <option value="Retail & Grocery">Retail & Grocery</option>
                                    <option value="Pharmacy">Pharmacy</option>
                                    <option value="Agro chemicals">Agro chemicals</option>
                                    <option value="Boutique">Boutique</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                                    className="w-full rounded-xl border border-[#eef0f2] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground">Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full rounded-xl border border-[#eef0f2] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-[13px] font-medium text-muted-foreground">Physical Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    rows={3}
                                    className="w-full rounded-xl border border-[#eef0f2] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Business Logo</h3>
                            {isUploading && (
                                <div className="flex items-center gap-2 text-[12px] font-medium text-[#006c49] dark:text-[#6ffbbe]">
                                    <Loader2 className="size-3 animate-spin" />
                                    Uploading...
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-col items-center justify-center gap-6 py-4">
                            <div className="relative group/logo">
                                <div className="flex size-32 items-center justify-center overflow-hidden rounded-[2.5rem] border-2 border-dashed border-[#eef0f2] bg-[#fafafa] transition-all group-hover/logo:border-[#006c49]/40 dark:border-white/[0.12] dark:bg-white/[0.02] dark:group-hover/logo:border-[#6ffbbe]/40">
                                    {business?.logoUrl ? (
                                        <img 
                                            src={business.logoUrl} 
                                            alt="Logo" 
                                            className="size-full object-cover transition-transform group-hover/logo:scale-105" 
                                        />
                                    ) : (
                                        <Store className="size-10 text-muted-foreground transition-opacity group-hover/logo:opacity-50" />
                                    )}
                                    
                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] dark:bg-black/60">
                                            <Loader2 className="size-6 animate-spin text-[#006c49] dark:text-[#6ffbbe]" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-full">
                                <UploadButton
                                    endpoint="storeLogo"
                                    onUploadProgress={() => setIsUploading(true)}
                                    onClientUploadComplete={() => {
                                        setIsUploading(false);
                                        mutate();
                                        toast.success("Logo uploaded successfully!");
                                    }}
                                    onUploadError={(error: Error) => {
                                        setIsUploading(false);
                                        toast.error(`Upload failed: ${error.message}`);
                                    }}
                                    appearance={{
                                        button: "ut-ready:bg-[#003527] ut-uploading:cursor-not-allowed bg-[#006c49] after:bg-emerald-400 w-full rounded-xl text-[13px] font-semibold h-11 shadow-lg shadow-emerald-900/10 transition-all hover:brightness-105 active:scale-95",
                                        allowedContent: "hidden",
                                    }}
                                    content={{
                                        button({ ready, isUploading }) {
                                            if (isUploading) return (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="size-4 animate-spin" />
                                                    Uploading...
                                                </div>
                                            );
                                            if (ready) return (
                                                <div className="flex items-center gap-2">
                                                    <Upload className="size-4" />
                                                    Change Logo
                                                </div>
                                            );
                                            return "Preparing...";
                                        }
                                    }}
                                />
                                <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                                    Recommended: Square image, 512x512px.<br />
                                    Supported: PNG, JPG (Max 4MB)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProductsPageShell>
    );
}
