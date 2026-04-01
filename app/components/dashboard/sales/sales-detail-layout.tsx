"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Filter, Share2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type SalesDetailLayoutProps = {
    title: string;
    description: string;
    subtitle?: string;
    children: ReactNode;
    actions?: ReactNode;
};

export function SalesDetailLayout({
    title,
    description,
    subtitle,
    children,
    actions,
}: SalesDetailLayoutProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const period = searchParams.get("period") || "7";
    const [shareMsg, setShareMsg] = useState(false);

    function handlePeriodChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const params = new URLSearchParams(searchParams);
        params.set("period", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
    }

    async function handleShare() {
        try {
            if (navigator.share) {
                await navigator.share({ title, url: window.location.href });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setShareMsg(true);
                setTimeout(() => setShareMsg(false), 2000);
            }
        } catch (e) {
            console.error("Share failed", e);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* HEADER */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                    <Link
                        href="/dashboard/sales/overview"
                        className="flex w-fit items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-3" strokeWidth={2.5} />
                        Back to overview
                    </Link>
                    <div className="flex flex-col gap-1">
                        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {title}
                        </h1>
                        <p className="max-w-2xl text-[14px] text-muted-foreground">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="relative flex h-10 items-center gap-2 rounded-xl border border-[#eef0f2] bg-white px-3 dark:border-white/[0.08] dark:bg-[#111] focus-within:border-[#006c49]/40 focus-within:ring-2 focus-within:ring-[#006c49]/20">
                        <Calendar className="size-4 text-muted-foreground" />
                        <select
                            value={period}
                            onChange={handlePeriodChange}
                            className="absolute inset-0 cursor-pointer w-full h-full opacity-0"
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="365">This Year</option>
                        </select>
                        <span className="text-[13px] font-medium text-foreground pointer-events-none">
                            {period === "7" ? "Last 7 days" : period === "30" ? "Last 30 days" : "This Year"}
                        </span>
                    </div>
                    <button className="flex size-10 items-center justify-center rounded-xl border border-[#eef0f2] bg-white text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:border-white/[0.08] dark:bg-[#111] dark:hover:bg-[#1a1a1a]">
                        <Filter className="size-4" />
                    </button>
                    <button onClick={handleShare} className="relative flex size-10 items-center justify-center rounded-xl border border-[#eef0f2] bg-white text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:border-white/[0.08] dark:bg-[#111] dark:hover:bg-[#1a1a1a]">
                        <Share2 className="size-4" />
                        {shareMsg && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[11px] font-medium text-white shadow shadow-black/20">
                                Copied link!
                            </span>
                        )}
                    </button>
                    {actions}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex flex-col gap-6">
                {children}
            </div>
        </div>
    );
}
