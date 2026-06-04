import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { Store, ScanLine, BarChart3, ShieldCheck } from "lucide-react";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about ZeoFex, the team behind VentraPOS. We build cloud POS and business software for retailers, pharmacies, restaurants, and growing SMEs.",
};

type AboutSectionImage =
  | { type: "single"; src: string; alt: string }
  | { type: "theme"; light: string; dark: string; alt: string };

const aboutSections: {
  title: string;
  description: string;
  icon: typeof Store;
  image: AboutSectionImage;
}[] = [
  {
    title: "Who We Are",
    description:
      "ZeoFex is a technology solutions company dedicated to building innovative and scalable digital products for businesses. We created VentraPOS — a cloud POS and business management platform — so retailers can move from manual notebooks and scattered spreadsheets to one modern system they can trust every day.",
    icon: Store,
    image: {
      type: "single",
      src: "/hero-dashboard.png",
      alt: "VentraPOS product dashboard by ZeoFex",
    },
  },
  {
    title: "What We Do",
    description:
      "ZeoFex specializes in web and mobile application development, data-driven systems, and reliable software tailored to client needs. With VentraPOS, we bring checkout, inventory, staff permissions, customer records, expenses, and reporting into one place so shops can start selling without building custom software from scratch.",
    icon: ScanLine,
    image: {
      type: "theme",
      light: "/onboarding/store-setup-light.png",
      dark: "/onboarding/store-setup-dark.png",
      alt: "VentraPOS store setup by ZeoFex",
    },
  },
  {
    title: "Built for Real Operations",
    description:
      "Through VentraPOS, ZeoFex supports many businesses on one platform with clear roles per branch. Owners, managers, cashiers, and stock officers each see what they need. Live dashboards, low stock alerts, and finance visibility turn sales and stock into insight your team can act on.",
    icon: BarChart3,
    image: {
      type: "theme",
      light: "/landing/security-light.png",
      dark: "/landing/security-dark.png",
      alt: "VentraPOS security and compliance",
    },
  },
  {
    title: "Our Philosophy",
    description:
      "At ZeoFex, we believe technology should empower businesses and communities. VentraPOS is built to be fast, clear, and reliable — for operators who are not developers. It works well on mobile, keeps an audit trail, and protects your data so you can run smarter operations as you grow.",
    icon: ShieldCheck,
    image: {
      type: "theme",
      light: "/landing/analytics-light.png",
      dark: "/landing/analytics-dark.png",
      alt: "VentraPOS analytics and reporting",
    },
  },
];

function SectionImage({
  image,
  priority = false,
}: {
  image: AboutSectionImage;
  priority?: boolean;
}) {
  const imageClass =
    "object-contain p-3 sm:p-5 lg:p-6 transition-transform duration-500 lg:hover:scale-[1.02]";

  if (image.type === "single") {
    return (
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className={imageClass}
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority={priority}
      />
    );
  }

  return (
    <>
      <Image
        src={image.light}
        alt={image.alt}
        fill
        className={`${imageClass} block dark:hidden`}
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
      <Image
        src={image.dark}
        alt={image.alt}
        fill
        className={`${imageClass} hidden dark:block`}
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    </>
  );
}

function SectionCopy({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Store;
  title: string;
  description: string;
}) {
  return (
    <>
      <div className="mb-3.5 flex items-center gap-3 sm:mb-4 sm:gap-3.5 lg:mb-5 lg:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#6ffbbe] sm:h-11 sm:w-11 lg:h-14 lg:w-14 lg:rounded-2xl">
          <Icon className="h-5 w-5 lg:h-7 lg:w-7" aria-hidden />
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight text-white sm:text-xl lg:text-2xl">
          {title}
        </h2>
      </div>
      <p className="text-[14px] leading-[1.65] text-white/90 sm:text-[15px] lg:text-base lg:leading-relaxed">
        {description}
      </p>
    </>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40 pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20 lg:pt-40 lg:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#006c49_0%,transparent_40%)] opacity-[0.06] dark:opacity-20" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#006c49]/25 bg-[#003527]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006c49] dark:border-[#006c49]/20 dark:bg-[#003527]/30 dark:text-[#6ffbbe] sm:mb-6 sm:px-4 sm:py-1.5 sm:text-xs">
            <span className="size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" aria-hidden />
            About ZeoFex
          </div>
          <h1 className="mx-auto mb-4 max-w-[18ch] font-[family-name:var(--font-display)] text-[clamp(1.75rem,6.5vw,3.5rem)] font-semibold leading-[1.12] tracking-tight text-foreground sm:mb-6 sm:max-w-3xl md:max-w-none lg:text-7xl lg:font-extrabold">
            Building VentraPOS for Modern Retail
          </h1>
          <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:max-w-2xl sm:text-lg md:max-w-3xl md:text-xl">
            ZeoFex helps retailers and growing SMEs run sales, inventory, staff, and finances through
            VentraPOS — one cloud platform built for Ghana and similar markets.
          </p>
        </div>
      </section>

      {/* Content sections */}
      <section className="bg-background py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:space-y-14 sm:px-6 lg:space-y-20 lg:px-8">
          {aboutSections.map((section, idx) => {
            const Icon = section.icon;
            const isEven = idx % 2 !== 0;

            return (
              <article
                key={section.title}
                className="md:grid md:grid-cols-2 md:items-center md:gap-8 lg:gap-12"
              >
                {/* Combined card on mobile; splits into two columns from md */}
                <div className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#003527] to-[#006c49] shadow-[0_20px_50px_-16px_rgba(0,53,39,0.4)] ring-1 ring-[#006c49]/35 sm:rounded-3xl md:contents md:overflow-visible md:rounded-none md:bg-transparent md:shadow-none md:ring-0">
                  <div
                    className={`relative aspect-[16/10] min-h-[200px] w-full shrink-0 bg-[#f0faf6] dark:bg-[#0a1f18] sm:min-h-[220px] md:aspect-auto md:min-h-[300px] md:h-[300px] md:overflow-hidden md:rounded-3xl md:shadow-[0_12px_40px_-16px_rgba(0,108,73,0.25)] md:ring-1 md:ring-[#006c49]/20 lg:h-[360px] dark:md:bg-surface-elevated dark:md:ring-border/40 ${
                      isEven ? "md:order-2" : "md:order-1"
                    }`}
                  >
                    <SectionImage image={section.image} priority={idx === 0} />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#003527]/50 to-transparent md:hidden"
                    />
                  </div>

                  <div
                    className={`border-t border-white/10 px-5 py-5 sm:px-6 sm:py-7 md:border-0 md:rounded-[2.5rem] md:bg-gradient-to-br md:from-[#003527] md:to-[#006c49] md:p-8 md:shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] md:ring-1 md:ring-[#006c49]/40 md:transition-transform md:hover:-translate-y-1 md:hover:shadow-[0_28px_56px_-12px_rgba(0,53,39,0.28)] lg:p-10 ${
                      isEven ? "md:order-1" : "md:order-2"
                    }`}
                  >
                    <SectionCopy
                      icon={Icon}
                      title={section.title}
                      description={section.description}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#003527] px-4 py-14 text-center text-white sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-2xl lg:max-w-3xl">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-[clamp(1.5rem,5.5vw,2.25rem)] font-semibold leading-tight sm:mb-6 lg:text-4xl">
            Ready to innovate with ZeoFex?
          </h2>
          <p className="mb-8 text-[15px] leading-relaxed text-white/85 sm:text-lg">
            ZeoFex is always open to collaboration, partnerships, and VentraPOS demos. Whether you
            are opening your first branch or scaling across locations, get in touch with our team.
          </p>
          <Link
            href="/contact"
            className="inline-flex h-12 w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-br from-[#006c49] to-[#004d38] px-8 text-[15px] font-medium text-white shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)] transition-[filter] hover:brightness-110 sm:mx-auto sm:w-auto sm:min-w-[200px]"
          >
            Contact Us
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
