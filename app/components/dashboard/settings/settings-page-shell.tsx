"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SettingsPageShell({
    title,
    description,
    children,
    backHref = "/dashboard/settings",
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    backHref?: string;
}) {
    return (
        <main className="min-h-full bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8 lg:py-12 dark:bg-[#0a0a0a]">
            <div className="mx-auto max-w-6xl">
                <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-4 flex items-center gap-3">
                            <Link
                                href={backHref}
                                className="flex size-10 items-center justify-center rounded-2xl border border-[#eef0f2] bg-white text-muted-foreground transition-all hover:bg-[#fafafa] hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                            >
                                <ArrowLeft className="size-5" />
                            </Link>
                            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
                                {title}
                            </h1>
                        </div>
                        {description && (
                            <p className="text-[16px] text-muted-foreground ml-13">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="min-h-0 min-w-0 flex-1">
                    {children}
                </div>
            </div>
        </main>
    );
}
