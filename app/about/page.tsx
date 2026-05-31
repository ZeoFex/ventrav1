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
    "Learn about VentraPOS, the cloud POS and business management platform built for retailers, pharmacies, restaurants, and growing SMEs.",
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
      "VentraPOS is a cloud POS and business management platform for supermarkets, mini marts, pharmacies, restaurants, boutiques, and other retailers. We help businesses move from manual notebooks and scattered spreadsheets to one modern system they can trust every day.",
    icon: Store,
    image: {
      type: "single",
      src: "/landing/ventra.jpg",
      alt: "VentraPOS dashboard preview",
    },
  },
  {
    title: "What We Do",
    description:
      "From checkout and receipts to inventory, staff permissions, customer records, expenses, and reporting, VentraPOS brings daily operations into one place. Sign up, set up your store, add products and staff, and start selling without building custom software from scratch.",
    icon: ScanLine,
    image: {
      type: "theme",
      light: "/landing/order-light.png",
      dark: "/landing/order-pos.png",
      alt: "VentraPOS order management preview",
    },
  },
  {
    title: "Built for Real Operations",
    description:
      "VentraPOS supports many businesses on one platform with clear roles per branch. Owners, managers, cashiers, and stock officers each see what they need. Live dashboards, low stock alerts, and finance visibility turn sales and stock into insight your team can act on.",
    icon: BarChart3,
    image: {
      type: "theme",
      light: "/landing/analytics-light.png",
      dark: "/landing/analytics-dark.png",
      alt: "VentraPOS sales analytics preview",
    },
  },
  {
    title: "Our Philosophy",
    description:
      "We believe business software should be fast, clear, and reliable, not a toy checkout app. VentraPOS is built for operators who are not developers. It works well on mobile, keeps an audit trail, and protects your data so you can run smarter operations as you grow.",
    icon: ShieldCheck,
    image: {
      type: "theme",
      light: "/landing/security-light.png",
      dark: "/landing/security-dark.png",
      alt: "VentraPOS security and trust",
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
            About VentraPOS
          </div>
          <h1 className="mx-auto mb-4 max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(1.75rem,7vw,3.5rem)] font-semibold leading-[1.12] tracking-tight text-foreground sm:mb-6 sm:max-w-none lg:text-7xl lg:font-extrabold">
            Your Business Operating System
          </h1>
          <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:max-w-2xl sm:text-lg md:text-xl">
            VentraPOS helps retailers and growing SMEs run sales, inventory, staff, and finances from
            one cloud platform built for Ghana and similar markets.
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
                className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12"
              >
                {/* Combined card on mobile; splits into two columns at lg */}
                <div className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#003527] to-[#006c49] shadow-[0_20px_50px_-16px_rgba(0,53,39,0.4)] ring-1 ring-[#006c49]/35 sm:rounded-3xl lg:contents lg:overflow-visible lg:rounded-none lg:bg-transparent lg:shadow-none lg:ring-0">
                  <div
                    className={`relative aspect-[16/10] w-full shrink-0 bg-[#f0faf6] dark:bg-[#0a1f18] lg:aspect-auto lg:h-[360px] lg:overflow-hidden lg:rounded-3xl lg:shadow-[0_12px_40px_-16px_rgba(0,108,73,0.25)] lg:ring-1 lg:ring-[#006c49]/20 dark:lg:bg-surface-elevated dark:lg:ring-border/40 ${
                      isEven ? "lg:order-2" : "lg:order-1"
                    }`}
                  >
                    <SectionImage image={section.image} priority={idx === 0} />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#003527]/50 to-transparent lg:hidden"
                    />
                  </div>

                  <div
                    className={`border-t border-white/10 px-5 py-5 sm:px-6 sm:py-6 lg:border-0 lg:rounded-[2.5rem] lg:bg-gradient-to-br lg:from-[#003527] lg:to-[#006c49] lg:p-10 lg:shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] lg:ring-1 lg:ring-[#006c49]/40 lg:transition-transform lg:hover:-translate-y-1 lg:hover:shadow-[0_28px_56px_-12px_rgba(0,53,39,0.28)] ${
                      isEven ? "lg:order-1" : "lg:order-2"
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
            Ready to run your business on VentraPOS?
          </h2>
          <p className="mb-8 text-[15px] leading-relaxed text-white/85 sm:text-lg">
            Whether you are opening your first branch or scaling across locations, we would love to
            hear from you. Book a demo or get in touch with our team.
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
