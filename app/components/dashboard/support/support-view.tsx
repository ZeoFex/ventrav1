"use client";

import {
    MessageSquare,
    Mail,
    Phone,
    Search,
    BookOpen,
    PlayCircle,
    FileText,
    ShieldCheck,
    CheckCircle2,
    ExternalLink,
    ChevronRight
} from "lucide-react";

export function SupportView() {
    return (
        <main className="min-h-full bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8 lg:py-12 dark:bg-[#0a0a0a]">
            <div className="mx-auto max-w-6xl">
                {/* Header Section */}
                <div className="mb-12 text-center">
                    <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                        How can we help you?
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Search our help center or contact our support team directly.
                    </p>

                    <div className="mx-auto mt-8 max-w-2xl">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-[#006c49] dark:group-focus-within:text-[#6ffbbe]" />
                            <input
                                type="text"
                                placeholder="Search for articles, guides, and more..."
                                className="h-16 w-full rounded-[2rem] border border-[#eef0f2] bg-white pl-14 pr-6 text-[16px] shadow-sm outline-none ring-[#006c49]/15 transition-all focus:border-[#006c49]/40 focus:ring-4 dark:border-white/[0.08] dark:bg-[#111] dark:ring-[#6ffbbe]/10 dark:focus:border-[#6ffbbe]/40"
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Help Categories */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
                    <HelpCard
                        icon={<BookOpen className="size-6" />}
                        title="Knowledge Base"
                        description="Detailed guides on every feature of VentraPOS."
                    />
                    <HelpCard
                        icon={<PlayCircle className="size-6" />}
                        title="Video Tutorials"
                        description="Step-by-step visual guides for quick setup."
                    />
                    <HelpCard
                        icon={<FileText className="size-6" />}
                        title="API Documentation"
                        description="Build custom integrations with our robust API."
                    />
                    <HelpCard
                        icon={<ShieldCheck className="size-6" />}
                        title="Security Center"
                        description="Learn how we keep your business data safe."
                    />
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Contact Channels */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-[22px] font-bold tracking-tight px-2">Contact Support</h2>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <ContactCard
                                icon={<MessageSquare className="size-6" />}
                                title="Live Chat"
                                description="Average response time: 2 mins"
                                status="Online"
                                action="Start Chat"
                                highlight
                            />
                            <ContactCard
                                icon={<Mail className="size-6" />}
                                title="Email Support"
                                description="Average response time: 2 hours"
                                status="Available"
                                action="Send Ticket"
                            />
                            <ContactCard
                                icon={<Phone className="size-6" />}
                                title="Phone Support"
                                description="Available Mon-Fri, 9am - 6pm"
                                status="Offline"
                                action="Call +233 24 000 0000"
                                disabled
                            />
                            <div className="rounded-[2rem] border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111] flex flex-col justify-center">
                                <p className="text-[14px] font-medium text-muted-foreground mb-4">Enterprise customer?</p>
                                <button className="flex items-center justify-center gap-2 rounded-2xl border border-[#006c49] text-[#006c49] py-3 text-[14px] font-bold hover:bg-[#006c49]/5 dark:border-[#6ffbbe] dark:text-[#6ffbbe] dark:hover:bg-[#6ffbbe]/5 transition-all">
                                    Contact Manager
                                    <ExternalLink className="size-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* System Status & FAQs */}
                    <div className="space-y-6">
                        <div className="rounded-[2.5rem] bg-[#006c49] p-8 text-white shadow-2xl relative overflow-hidden dark:bg-[#014d3a]">
                            <CheckCircle2 className="absolute top-[-20px] right-[-20px] size-48 text-white/[0.05] rotate-12" />
                            <h3 className="text-[18px] font-bold mb-2 relative z-10">System Status</h3>
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <div className="size-2 rounded-full bg-[#6ffbbe] animate-pulse" />
                                <span className="text-[14px] font-medium text-[#6ffbbe]">All Systems Operational</span>
                            </div>
                            <p className="text-[13px] text-white/70 leading-relaxed relative z-10">
                                Retail cloud and POS terminals are performing optimally across all regions.
                            </p>
                        </div>

                        <div className="rounded-[2rem] border border-[#eef0f2] bg-white p-8 dark:border-white/[0.08] dark:bg-[#111]">
                            <h3 className="text-[18px] font-bold mb-6">Popular FAQs</h3>
                            <div className="space-y-4">
                                <FaqItem question="How do I process a refund?" />
                                <FaqItem question="Can I use the POS offline?" />
                                <FaqItem question="How to add new staff members?" />
                                <FaqItem question="Where to find sales reports?" />
                            </div>
                            <button className="mt-8 text-[14px] font-bold text-[#006c49] dark:text-[#6ffbbe] hover:underline flex items-center gap-2">
                                View all FAQs
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

function HelpCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="group rounded-[2rem] border border-[#eef0f2] bg-white p-8 text-center transition-all hover:border-[#006c49]/20 hover:shadow-xl dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/20">
            <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#006c49]/5 text-[#006c49] transition-transform group-hover:scale-110 dark:bg-[#6ffbbe]/5 dark:text-[#6ffbbe]">
                {icon}
            </div>
            <h3 className="mb-2 text-[16px] font-bold text-foreground tracking-tight">{title}</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}

function ContactCard({
    icon,
    title,
    description,
    status,
    action,
    highlight = false,
    disabled = false
}: {
    icon: React.ReactNode,
    title: string,
    description: string,
    status: string,
    action: string,
    highlight?: boolean,
    disabled?: boolean
}) {
    return (
        <div className={`rounded-[2rem] border p-8 transition-all ${highlight
                ? "border-[#006c49]/20 bg-[#006c49]/[0.02] shadow-sm dark:border-[#6ffbbe]/20 dark:bg-[#6ffbbe]/[0.02]"
                : "border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111]"
            }`}>
            <div className="flex items-start justify-between mb-6">
                <div className={`flex size-12 items-center justify-center rounded-2xl ${highlight ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-black" : "bg-[#f4f5f7] text-muted-foreground dark:bg-white/5"
                    }`}>
                    {icon}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider">
                    <div className={`size-1.5 rounded-full ${status === "Online" || status === "Available" ? "bg-[#22c55e]" : "bg-muted-foreground/30"
                        }`} />
                    {status}
                </div>
            </div>
            <h3 className="mb-1 text-[16px] font-bold text-foreground">{title}</h3>
            <p className="mb-6 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
            <button
                disabled={disabled}
                className={`w-full rounded-xl py-3 text-[14px] font-bold transition-all ${highlight
                        ? "bg-[#006c49] text-white shadow-lg shadow-[#006c49]/20 hover:brightness-110 dark:bg-[#6ffbbe] dark:text-black dark:shadow-[#6ffbbe]/10"
                        : "border border-[#eef0f2] text-foreground hover:bg-[#fafafa] dark:border-white/10 dark:hover:bg-white/5"
                    } disabled:opacity-50 disabled:grayscale`}
            >
                {action}
            </button>
        </div>
    );
}

function FaqItem({ question }: { question: string }) {
    return (
        <button className="flex w-full items-center justify-between py-3 text-left group">
            <span className="text-[14px] font-medium text-foreground group-hover:text-[#006c49] dark:group-hover:text-[#6ffbbe] transition-colors">{question}</span>
            <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>
    );
}
