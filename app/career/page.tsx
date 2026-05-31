import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Briefcase,
  Code2,
  Handshake,
  Layers,
  MapPin,
  Sparkles,
  Users,
  Wifi,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join VentraPOS or collaborate as a freelancer, agency, or partner. We build cloud POS software for retailers in Ghana and growing markets.",
};

const collaboratorTypes = [
  {
    icon: Users,
    title: "Freelancers & specialists",
    description:
      "Designers, frontend engineers, backend engineers, or QA who have shipped production apps. Bonus if you have worked on dashboards, payments, or mobile first flows in emerging markets. Show us what you built.",
  },
  {
    icon: Briefcase,
    title: "Agencies & contractors",
    description:
      "Fixed scope work such as design systems, integrations, native wrappers, or documentation. We scope tightly, pay on milestones, and value honest timelines.",
  },
  {
    icon: Handshake,
    title: "Partnerships",
    description:
      "Hardware vendors, payment providers, accountants serving SMEs, or regional distributors. If your customers run shops and need POS that fits their context, we want to talk.",
  },
] as const;

const workAreas = [
  {
    icon: Layers,
    title: "Product & operations",
    description: "Checkout, inventory, branches, and reporting that merchants use every day.",
  },
  {
    icon: Wifi,
    title: "Offline & sync",
    description: "Flows that keep shops running when connectivity is slow or drops out.",
  },
  {
    icon: Code2,
    title: "Engineering stack",
    description: "Next.js, TypeScript, PostgreSQL, and Redis. Practical tools chosen for reliability.",
  },
  {
    icon: MapPin,
    title: "Local context",
    description: "Cedis, Ghana regions, receipts, and workflows that match how shops really operate.",
  },
] as const;

const applySteps = [
  "Send a short note through our contact page.",
  "Include a CV or portfolio link.",
  "Tell us about one project you shipped end to end.",
] as const;

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40 pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20 lg:pt-36 lg:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#006c49_0%,transparent_40%)] opacity-[0.06] dark:opacity-20" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#006c49]/25 bg-[#003527]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006c49] dark:border-[#006c49]/20 dark:bg-[#003527]/30 dark:text-[#6ffbbe] sm:mb-6 sm:px-4 sm:py-1.5 sm:text-xs">
            <span className="size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" aria-hidden />
            Careers & collaborators
          </div>
          <h1 className="mx-auto mb-4 max-w-[20ch] font-[family-name:var(--font-display)] text-[clamp(1.75rem,6.5vw,3.25rem)] font-semibold leading-[1.12] tracking-tight text-foreground sm:mb-6 sm:max-w-3xl lg:text-5xl">
            Build retail software that works on real shop floors
          </h1>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
            VentraPOS is built for supermarkets, pharmacies, and neighbourhood retailers across
            Ghana and similar markets. We are a focused team and we work with freelancers,
            studios, and partners when we need extra hands or deep expertise.
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-b border-border/40 bg-[#f0faf6]/60 py-10 dark:bg-[#003527]/10 sm:py-12">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-3 sm:gap-6 sm:px-6 lg:px-8">
          {[
            { label: "Mission", value: "POS for growing retailers" },
            { label: "Market", value: "Ghana & similar regions" },
            { label: "Team", value: "Small, deliberate hiring" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#006c49]/15 bg-background px-5 py-4 text-center shadow-sm sm:rounded-3xl sm:px-6 sm:py-5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#006c49] dark:text-[#6ffbbe]">
                {item.label}
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-[15px] font-semibold text-foreground sm:text-base">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Collaborator types */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center sm:mb-12">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Who we work with
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              We hire carefully and collaborate openly when the fit is right.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            {collaboratorTypes.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#003527] to-[#006c49] p-6 text-white shadow-[0_20px_50px_-16px_rgba(0,53,39,0.4)] ring-1 ring-[#006c49]/35 sm:rounded-3xl sm:p-7 lg:p-8"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-[#6ffbbe] sm:h-12 sm:w-12">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight sm:text-xl">
                  {title}
                </h3>
                <p className="mt-3 flex-1 text-[14px] leading-[1.65] text-white/90 sm:text-[15px]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you would work on */}
      <section className="border-y border-border/40 bg-muted/25 py-12 dark:bg-muted/10 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#006c49]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#006c49] dark:text-[#6ffbbe]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              The work
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              What you would work on
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Meaningful product problems with direct impact on how businesses run day to day.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6">
            {workAreas.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-border/50 bg-background p-5 shadow-sm transition-shadow hover:shadow-md sm:rounded-3xl sm:p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground sm:text-lg">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open roles / how to apply */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-[#006c49]/20 bg-gradient-to-br from-[#f0faf6] to-background shadow-[0_16px_48px_-20px_rgba(0,108,73,0.2)] sm:rounded-3xl dark:from-[#003527]/20 dark:to-background">
            <div className="grid lg:grid-cols-2">
              <div className="border-b border-[#006c49]/15 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Open roles
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  We do not run a live job board yet. If VentraPOS sounds like your kind of
                  problem, we would like to hear from you. POS software that respects local
                  money, languages, and how shops really run is rare. If that motivates you,
                  reach out.
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#003527] to-[#006c49] p-6 text-white sm:p-8 lg:p-10">
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold sm:text-xl">
                  How to apply
                </h3>
                <ol className="mt-5 space-y-4">
                  {applySteps.map((step, index) => (
                    <li key={step} className="flex gap-3.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-[#6ffbbe]">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-[14px] leading-relaxed text-white/90 sm:text-[15px]">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
                <Link
                  href="/contact"
                  className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-medium text-[#003527] transition-colors hover:bg-white/95 sm:w-auto sm:min-w-[180px] dark:bg-[#6ffbbe] dark:text-[#002818] dark:hover:bg-[#5debaf]"
                >
                  Get in touch
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#003527] px-4 py-14 text-center text-white sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-2xl lg:max-w-3xl">
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,5.5vw,2.25rem)] font-semibold leading-tight sm:mb-2 lg:text-4xl">
            Ready to build with us?
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85 sm:text-lg">
            Short, honest notes work best. Tell us what you care about and what you have shipped.
            We read every message.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-12 w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-br from-[#006c49] to-[#004d38] px-8 text-[15px] font-medium text-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)] transition-[filter] hover:brightness-110 sm:mx-auto sm:w-auto sm:min-w-[200px]"
          >
            Contact us
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
