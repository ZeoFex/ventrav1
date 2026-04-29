import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers · VentraPOS",
  description:
    "Work with the team behind VentraPOS — cloud POS for retailers in Ghana. Freelance, contract, and partnership enquiries.",
};

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <article className="relative border-b border-border/40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,108,73,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(111,251,190,0.08),transparent)]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8">
          <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Careers & collaborators
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Retail software that survives flaky Wi‑Fi and real shop floors.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
            VentraPOS is built for supermarkets, pharmacies, and neighbourhood retailers —
            mostly in Ghana, in cedis, with receipts and workflows people actually use.
            We&apos;re a small team; we hire carefully and often work with freelancers,
            studios, and partners when we need extra hands or domain expertise.
          </p>
        </div>
      </article>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
          Who we talk to
        </h2>
        <div className="mt-8 space-y-10">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">
              Freelancers & specialists
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              Designers, frontend engineers, backend engineers, or QA who&apos;ve shipped
              production apps — especially if you&apos;ve worked on dashboards, payments,
              or mobile-first flows in emerging markets. Tell us what you&apos;ve built,
              not your buzzwords.
            </p>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">
              Agencies & contractors
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              Fixed-scope pieces (design systems, integrations, native wrappers, docs).
              We scope tightly, pay on milestones, and prefer honest timelines over slide
              decks.
            </p>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">
              Partnerships
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              Hardware vendors, payment providers, accountants who serve SMEs, or regional
              distributors — if your customers run shops and need a POS that fits their
              context, say hello.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border/40 bg-muted/30 py-14 dark:bg-muted/15">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
            What you&apos;d actually work on
          </h2>
          <ul className="mt-6 list-none space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-[0.35rem] size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
              Checkout, inventory, branches, and reporting — things merchants touch daily.
            </li>
            <li className="flex gap-3">
              <span className="mt-[0.35rem] size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
              Offline-capable flows and sync — shops don&apos;t always have perfect
              connectivity.
            </li>
            <li className="flex gap-3">
              <span className="mt-[0.35rem] size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
              Stack you&apos;ll see in the codebase: Next.js, TypeScript, PostgreSQL, Redis —
              boring on purpose where it counts.
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
          Open roles
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          We don&apos;t keep a live job board yet. If VentraPOS sounds like your kind of
          problem — POS that respects local money, languages, and how shops really run —
          send a short note via{" "}
          <Link href="/contact" className="font-medium text-[#006c49] underline-offset-4 hover:underline dark:text-[#6ffbbe]">
            contact
          </Link>
          . Include a CV or portfolio link and one paragraph on something you shipped end
          to end.
        </p>
      </section>

      <section className="bg-[#003527] px-4 py-16 text-white dark:bg-[#061f17] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-[family-name:var(--font-display)] text-xl font-semibold sm:text-2xl">
            Say hello
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/85">
            No boilerplate careers portal — just the contact form and humans on the other
            end. Short notes beat keyword-stuffed CVs.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-white px-7 text-[15px] font-medium text-[#003527] transition-colors hover:bg-white/95 dark:bg-[#6ffbbe] dark:text-[#002818] dark:hover:bg-[#5debaf]"
          >
            Contact us
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
