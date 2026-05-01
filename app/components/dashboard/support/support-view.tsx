"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
    MessageSquare,
    Mail,
    Phone,
    BookOpen,
    PlayCircle,
    FileText,
    ShieldCheck,
    CheckCircle2,
    ExternalLink,
    ChevronRight,
} from "lucide-react";
import { HelpSearchPanel } from "@/app/help/help-search-panel";
import { ZuriChatPanel } from "@/app/components/dashboard/support/zuri-chat-panel";
import type { KbCategoryConfig, PopularFaqItem } from "@/server/knowledge-base/types";

export function SupportView({
    faqItems,
}: {
    faqItems: PopularFaqItem[];
    /** Reserved for future “suggested articles” chips; Help Search uses the public API. */
    categories?: KbCategoryConfig[];
}) {
    return (
        <main className="min-h-full bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8 lg:py-12 dark:bg-[#0a0a0a]">
            <div className="mx-auto max-w-6xl">
                <div className="mb-12 text-center">
                    <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                        How can we help you?
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Search our Help Centre or contact the team — same guides as{" "}
                        <Link
                            href="/help"
                            className="font-medium text-[#006c49] underline-offset-4 hover:underline dark:text-[#6ffbbe]"
                        >
                            ventrapos.com/help
                        </Link>
                        .
                    </p>

                    <div className="mx-auto mt-8 max-w-2xl text-left">
                        <HelpSearchPanel />
                    </div>
                    <div className="mx-auto mt-6 max-w-2xl text-left">
                        <ZuriChatPanel />
                    </div>
                </div>

                <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <HelpCard
                        href="/help"
                        icon={<BookOpen className="size-6" />}
                        title="Knowledge Base"
                        description="Guides for POS, stock, staff, billing, and more."
                    />
                    <HelpCard
                        href="/help"
                        icon={<PlayCircle className="size-6" />}
                        title="Guides & walkthroughs"
                        description="Text-first tutorials in the Help Centre — video library coming later."
                    />
                    <HelpCard
                        href="/api-reference"
                        icon={<FileText className="size-6" />}
                        title="API documentation"
                        description="HTTP reference for integrations and admin tooling."
                    />
                    <HelpCard
                        href="/help?category=security"
                        icon={<ShieldCheck className="size-6" />}
                        title="Security & privacy"
                        description="Account hygiene, roles, and how we protect merchant data."
                    />
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <h2 className="px-2 text-[22px] font-bold tracking-tight">Contact Support</h2>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <ContactCard
                                href="/contact"
                                icon={<MessageSquare className="size-6" />}
                                title="Message us"
                                description="Describe your issue — we reply by email as soon as we can."
                                status="Available"
                                action="Open contact form"
                                highlight
                            />
                            <ContactCard
                                href="/contact"
                                icon={<Mail className="size-6" />}
                                title="Email support"
                                description="Use the contact form for traceable requests and attachments."
                                status="Available"
                                action="Send a message"
                            />
                            <ContactCard
                                icon={<Phone className="size-6" />}
                                title="Phone support"
                                description="Scheduled phone support for eligible plans — request via contact form."
                                status="By request"
                                action="Request a call"
                                disabled
                            />
                            <div className="flex flex-col justify-center rounded-[2rem] border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                                <p className="mb-4 text-[14px] font-medium text-muted-foreground">
                                    Enterprise or multi-branch rollout?
                                </p>
                                <Link
                                    href="/contact"
                                    className="flex items-center justify-center gap-2 rounded-2xl border border-[#006c49] py-3 text-[14px] font-bold text-[#006c49] transition-all hover:bg-[#006c49]/5 dark:border-[#6ffbbe] dark:text-[#6ffbbe] dark:hover:bg-[#6ffbbe]/5"
                                >
                                    Contact us
                                    <ExternalLink className="size-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#006c49] p-8 text-white shadow-2xl dark:bg-[#014d3a]">
                            <CheckCircle2 className="absolute top-[-20px] right-[-20px] size-48 rotate-12 text-white/[0.05]" />
                            <h3 className="relative z-10 mb-2 text-[18px] font-bold">System status</h3>
                            <div className="relative z-10 mb-4 flex items-center gap-2">
                                <div className="size-2 animate-pulse rounded-full bg-[#6ffbbe]" />
                                <span className="text-[14px] font-medium text-[#6ffbbe]">Operational</span>
                            </div>
                            <p className="relative z-10 text-[13px] leading-relaxed text-white/70">
                                Check ventrapos.com/help for announcements if checkout or dashboards feel slow.
                            </p>
                        </div>

                        <div className="rounded-[2rem] border border-[#eef0f2] bg-white p-8 dark:border-white/[0.08] dark:bg-[#111]">
                            <h3 className="mb-6 text-[18px] font-bold">Popular FAQs</h3>
                            <div className="space-y-1 divide-y divide-border/60">
                                {faqItems.map((item, i) => (
                                    <PopularFaq key={`${item.question}-${item.slug ?? i}`} item={item} />
                                ))}
                            </div>
                            <Link
                                href="/help"
                                className="mt-8 flex items-center gap-2 text-[14px] font-bold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                            >
                                Browse all guides
                                <ChevronRight className="size-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

function PopularFaq({ item }: { item: PopularFaqItem }) {
    const slug = item.slug?.trim();
    const content = (
        <>
            <p className="text-[14px] font-medium text-foreground">{item.question}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{item.answer}</p>
            {slug ? (
                <p className="mt-2 text-[12px] font-semibold text-[#006c49] dark:text-[#6ffbbe]">
                    Read full guide →
                </p>
            ) : null}
        </>
    );
    const className = "block py-4 first:pt-0 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-xl";

    if (slug) {
        return (
            <Link href={`/help/${slug}`} className={className}>
                {content}
            </Link>
        );
    }
    return <div className={className}>{content}</div>;
}

function HelpCard({
    href,
    icon,
    title,
    description,
}: {
    href: string;
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="group block rounded-[2rem] border border-[#eef0f2] bg-white p-8 text-center shadow-sm outline-none ring-[#006c49]/15 transition-all hover:border-[#006c49]/20 hover:shadow-xl focus-visible:ring-2 dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/20"
        >
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#006c49]/5 text-[#006c49] transition-transform group-hover:scale-110 dark:bg-[#6ffbbe]/5 dark:text-[#6ffbbe]">
                {icon}
            </div>
            <h3 className="mb-2 text-[16px] font-bold tracking-tight text-foreground">{title}</h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        </Link>
    );
}

function ContactCard({
    href,
    icon,
    title,
    description,
    status,
    action,
    highlight = false,
    disabled = false,
}: {
    href?: string;
    icon: ReactNode;
    title: string;
    description: string;
    status: string;
    action: string;
    highlight?: boolean;
    disabled?: boolean;
}) {
    const cardClass =
        highlight
            ? "border-[#006c49]/20 bg-[#006c49]/[0.02] shadow-sm dark:border-[#6ffbbe]/20 dark:bg-[#6ffbbe]/[0.02]"
            : "border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111]";
    const buttonClass =
        highlight
            ? "bg-[#006c49] text-white shadow-lg shadow-[#006c49]/20 hover:brightness-110 dark:bg-[#6ffbbe] dark:text-black dark:shadow-[#6ffbbe]/10"
            : "border border-[#eef0f2] text-foreground hover:bg-[#fafafa] dark:border-white/10 dark:hover:bg-white/5";

    const label = (
        <span className={`block w-full rounded-xl py-3 text-center text-[14px] font-bold transition-all ${buttonClass}`}>
            {action}
        </span>
    );

    return (
        <div className={`rounded-[2rem] border p-8 transition-all ${cardClass}`}>
            <div className="mb-6 flex items-start justify-between">
                <div
                    className={`flex size-12 items-center justify-center rounded-2xl ${
                        highlight
                            ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-black"
                            : "bg-[#f4f5f7] text-muted-foreground dark:bg-white/5"
                    }`}
                >
                    {icon}
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1 text-[11px] font-bold uppercase tracking-wider dark:bg-white/5">
                    <div
                        className={`size-1.5 rounded-full ${
                            status === "Online" ||
                            status === "Available" ||
                            status === "By request"
                                ? "bg-[#22c55e]"
                                : "bg-muted-foreground/30"
                        }`}
                    />
                    {status}
                </div>
            </div>
            <h3 className="mb-1 text-[16px] font-bold text-foreground">{title}</h3>
            <p className="mb-6 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
            {!disabled && href ? (
                <Link href={href} className="block">
                    {label}
                </Link>
            ) : (
                <button type="button" disabled className="block w-full disabled:opacity-50 disabled:grayscale">
                    {label}
                </button>
            )}
        </div>
    );
}
