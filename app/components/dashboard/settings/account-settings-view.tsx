"use client";

import { User, Mail, Phone, MapPin, Camera, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { useUploadThing } from "@/app/lib/uploadthing";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AccountSettingsView() {
    const { data, isLoading: isProfileLoading } = useSWR("/api/auth/profile", fetcher);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const { startUpload, isUploading } = useUploadThing("userProfile", {
        onClientUploadComplete: () => {
            toast.success("Profile photo updated!");
            // Mutate both profile and session to update header instantly
            mutate("/api/auth/profile");
            mutate("/api/auth/session");
        },
        onUploadError: (error) => {
            toast.error(`Upload failed: ${error.message}`);
        },
    });

    useEffect(() => {
        if (data?.user) {
            setFirstName(data.user.firstName || "");
            setLastName(data.user.lastName || "");
            setPhone(data.user.phone || "");
            setCity(data.user.city || "");
        }
    }, [data]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/auth/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName, phone, city }),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            toast.success("Profile updated successfully!");
            mutate("/api/auth/profile");
            mutate("/api/auth/session");
        } catch (error) {
            toast.error("Error saving changes");
        } finally {
            setIsSaving(false);
        }
    };

    const initials = (firstName?.[0] || "") + (lastName?.[0] || "");

    if (isProfileLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-[#006c49]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row">
                {/* Profile Info Card */}
                <div className="flex-1 space-y-6">
                    <div className="rounded-[2rem] border border-[#eef0f2] bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-6 text-[18px] font-semibold tracking-tight">Personal Information</h3>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">First Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full rounded-2xl border border-[#e5e7eb] bg-transparent py-3.5 pl-11 pr-4 text-[15px] outline-none ring-[#006c49]/15 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Last Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full rounded-2xl border border-[#e5e7eb] bg-transparent py-3.5 pl-11 pr-4 text-[15px] outline-none ring-[#006c49]/15 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                                    <input
                                        type="email"
                                        value={data?.user?.email || ""}
                                        disabled
                                        className="w-full rounded-2xl border border-[#e5e7eb] bg-surface-card/50 py-3.5 pl-11 pr-4 text-[15px] text-muted-foreground/60 outline-none dark:border-white/[0.12]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full rounded-2xl border border-[#e5e7eb] bg-transparent py-3.5 pl-11 pr-4 text-[15px] outline-none ring-[#006c49]/15 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Location / City</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="w-full rounded-2xl border border-[#e5e7eb] bg-transparent py-3.5 pl-11 pr-4 text-[15px] outline-none ring-[#006c49]/15 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.12] dark:focus:border-[#6ffbbe]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 rounded-xl bg-[#006c49] px-6 py-3 text-[14px] font-bold text-white shadow-xl shadow-[#006c49]/20 transition-all hover:brightness-110 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Save className="size-4" strokeWidth={2.5} />
                                )}
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Profile Photo Side */}
                <div className="w-full lg:w-[320px] space-y-6">
                    <div className="rounded-[2rem] border border-[#eef0f2] bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-6 text-[16px] font-semibold text-center tracking-tight">Profile Photo</h3>
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative group">
                                <div className="size-32 rounded-full overflow-hidden bg-gradient-to-br from-[#003527] to-[#064e3b] flex items-center justify-center text-white text-3xl font-bold shadow-2xl relative">
                                    {data?.user?.avatarUrl ? (
                                        <img
                                            src={data.user.avatarUrl}
                                            alt="Profile"
                                            className="size-full object-cover transition-transform group-hover:scale-110"
                                        />
                                    ) : (
                                        initials || "VP"
                                    )}

                                    {/* Circular Loader Overlay */}
                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                            <div className="relative size-16">
                                                <svg className="size-full" viewBox="0 0 100 100">
                                                    <circle
                                                        className="text-white/20 stroke-current fill-none"
                                                        strokeWidth="8"
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                    />
                                                    <circle
                                                        className="text-[#6ffbbe] stroke-current fill-none animate-[dash_1.5s_ease-in-out_infinite]"
                                                        strokeWidth="8"
                                                        strokeLinecap="round"
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <label
                                    className="absolute bottom-0 right-0 size-10 rounded-full bg-white dark:bg-[#1a1a1a] shadow-lg border border-[#eef0f2] dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-[#006c49] transition-colors cursor-pointer group-hover:scale-105 active:scale-95"
                                >
                                    <Camera className="size-5" />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) startUpload([file]);
                                        }}
                                        disabled={isUploading}
                                    />
                                </label>
                            </div>
                            <div className="text-center">
                                <p className="text-[13px] text-muted-foreground leading-relaxed">
                                    Update your photo to help your team recognize you.
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground/60 uppercase tracking-widest font-bold">
                                    JPG OR PNG • MAX 2MB
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes dash {
                    0% {
                        stroke-dasharray: 1, 150;
                        stroke-dashoffset: 0;
                    }
                    50% {
                        stroke-dasharray: 90, 150;
                        stroke-dashoffset: -35;
                    }
                    100% {
                        stroke-dasharray: 90, 150;
                        stroke-dashoffset: -124;
                    }
                }
            `}</style>
        </div>
    );
}
