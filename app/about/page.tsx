import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import {
  BarChart3,
  Cloud,
  Headphones,
  Layers,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About VentraPOS",
  description:
    "VentraPOS is an all-in-one business management platform that helps businesses manage sales, inventory, expenses, customers, suppliers, and operations from a single, easy-to-use system.",
};

type ThemeImage = { type: "theme"; light: string; dark: string; alt: string };
type SingleImage = { type: "single"; src: string; alt: string };
type SectionImage = ThemeImage | SingleImage;

const featureItems: {
  title: string;
  description: string;
  icon: LucideIcon;
  image: SectionImage;
}[] = [
  {
    title: "Sales & Transactions",
    description:
      "Track sales in real-time and manage transactions with accuracy and speed.",
    icon: Receipt,
    image: {
      type: "single",
      src: "/aboutventrapos/mobileScanner.png",
      alt: "VentraPOS mobile barcode scanner for fast sales and checkout",
    },
  },
  {
    title: "Inventory Management",
    description:
      "Monitor stock levels, receive low-stock alerts, and track product movement effortlessly.",
    icon: Package,
    image: {
      type: "theme",
      light: "/aboutventrapos/productlistwhitebg.png",
      dark: "/aboutventrapos/productList.png",
      alt: "VentraPOS product catalog and inventory management",
    },
  },
  {
    title: "Supplier Management",
    description:
      "Manage supplier records, purchase history, deliveries, and inventory updates from one place.",
    icon: Truck,
    image: {
      type: "theme",
      light: "/aboutventrapos/suplieritemsrecordsonwhitescreen.png",
      dark: "/aboutventrapos/suplieritemsrecords.png",
      alt: "VentraPOS supplier records and purchase history",
    },
  },
  {
    title: "Expense Tracking",
    description:
      "Keep track of business expenses, utility bills, salaries, and operational costs.",
    icon: Wallet,
    image: {
      type: "single",
      src: "/aboutventrapos/expensistracker.png",
      alt: "VentraPOS expense reports and cost tracking",
    },
  },
  {
    title: "Customer Management",
    description:
      "Build stronger customer relationships with organized customer records and purchase histories.",
    icon: Users,
    image: {
      type: "single",
      src: "/aboutventrapos/searchengineontablet.png",
      alt: "VentraPOS customer search and relationship management on tablet",
    },
  },
  {
    title: "Business Insights",
    description:
      "Access reports and analytics that help you make better business decisions.",
    icon: BarChart3,
    image: {
      type: "single",
      src: "/aboutventrapos/summaryReport.png",
      alt: "VentraPOS sales summary reports and analytics dashboard",
    },
  },
];

const whyChooseItems: {
  title: string;
  description: string;
  icon: LucideIcon;
  image?: SectionImage;
}[] = [
  {
    title: "Easy to Use",
    description: "Designed for everyone, regardless of technical experience.",
    icon: Sparkles,
  },
  {
    title: "Reliable & Secure",
    description: "Your business data is protected with modern security practices.",
    icon: ShieldCheck,
  },
  {
    title: "Cloud-Powered",
    description: "Access your business information anytime and from anywhere.",
    icon: Cloud,
  },
  {
    title: "Scalable",
    description:
      "Whether you manage one shop or multiple branches, VentraPOS grows with your business.",
    icon: Layers,
    image: {
      type: "theme",
      light: "/aboutventrapos/branchesdesktopwhitebg.png",
      dark: "/aboutventrapos/branchesDesktop.png",
      alt: "VentraPOS multi-branch management across locations",
    },
  },
  {
    title: "Dedicated Support",
    description: "Our team is committed to helping you succeed every step of the way.",
    icon: Headphones,
    image: {
      type: "single",
      src: "/aboutventrapos/dedicated-support.png",
      alt: "ZeoFex contact page showing office, email, phone, and studio support options",
    },
  },
];

function ThemedSectionImage({
  image,
  priority = false,
  className = "object-contain p-3 sm:p-5 lg:p-6",
}: {
  image: SectionImage;
  priority?: boolean;
  className?: string;
}) {
  if (image.type === "single") {
    return (
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className={className}
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
        className={`${className} block dark:hidden`}
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority={priority}
      />
      <Image
        src={image.dark}
        alt={image.alt}
        fill
        className={`${className} hidden dark:block`}
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    </>
  );
}

function FeatureCard({
  title,
  description,
  icon: Icon,
  image,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  image?: SectionImage;
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-sm transition-colors hover:border-[#006c49]/25 sm:rounded-3xl dark:hover:border-[#6ffbbe]/20">
      {image && (
        <figure className="relative aspect-[16/10] w-full shrink-0 bg-[#f0faf6] dark:bg-[#0a1f18]">
          <ThemedSectionImage
            image={image}
            className="object-contain p-2 sm:p-3"
          />
        </figure>
      )}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#003527]/8 text-[#006c49] dark:bg-[#003527]/40 dark:text-[#6ffbbe]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground sm:text-lg">
          {title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
          {description}
        </p>
      </div>
    </li>
  );
}

function SectionHeading({
  title,
  centered = false,
}: {
  title: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,4.5vw,2.25rem)] font-semibold leading-tight text-foreground lg:text-3xl">
        {title}
      </h2>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40 pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20 lg:pt-40 lg:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#006c49_0%,transparent_40%)] opacity-[0.06] dark:opacity-20" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 xl:gap-16">
            <div className="text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#006c49]/25 bg-[#003527]/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006c49] dark:border-[#006c49]/20 dark:bg-[#003527]/30 dark:text-[#6ffbbe] sm:mb-6 sm:px-4 sm:py-1.5 sm:text-xs">
                <span
                  className="size-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]"
                  aria-hidden
                />
                About VentraPOS
              </div>
              <h1 className="mx-auto mb-4 max-w-[22ch] font-[family-name:var(--font-display)] text-[clamp(1.75rem,6.5vw,3.5rem)] font-semibold leading-[1.12] tracking-tight text-foreground sm:mb-6 sm:max-w-4xl lg:mx-0 lg:max-w-none lg:text-6xl lg:font-extrabold">
                Simplifying Business Management for Modern Businesses
              </h1>
              <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:max-w-2xl sm:text-lg md:max-w-3xl md:text-xl lg:mx-0">
                VentraPOS is an all-in-one business management platform designed to help
                businesses manage sales, inventory, expenses, customers, suppliers, and
                operations from a single, easy-to-use system.
              </p>
            </div>

            <figure className="relative mx-auto mt-10 aspect-[16/10] w-full max-w-xl overflow-hidden rounded-2xl bg-[#f0faf6] shadow-[0_20px_50px_-16px_rgba(0,53,39,0.25)] ring-1 ring-[#006c49]/20 sm:rounded-3xl lg:mt-0 lg:max-w-none dark:bg-[#0a1f18] dark:ring-border/40">
              <ThemedSectionImage
                image={{
                  type: "single",
                  src: "/aboutventrapos/dashboardhomepage.png",
                  alt: "VentraPOS dashboard homepage on MacBook showing sales and activity",
                }}
                priority
                className="object-contain p-2 sm:p-4"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-background py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <article className="md:grid md:grid-cols-2 md:items-center md:gap-8 lg:gap-12">
            <div className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#003527] to-[#006c49] shadow-[0_20px_50px_-16px_rgba(0,53,39,0.4)] ring-1 ring-[#006c49]/35 sm:rounded-3xl md:contents md:overflow-visible md:rounded-none md:bg-transparent md:shadow-none md:ring-0">
              <div className="relative aspect-[16/10] min-h-[200px] w-full shrink-0 bg-[#f0faf6] dark:bg-[#0a1f18] sm:min-h-[220px] md:order-1 md:aspect-auto md:min-h-[300px] md:h-[300px] md:overflow-hidden md:rounded-3xl md:shadow-[0_12px_40px_-16px_rgba(0,108,73,0.25)] md:ring-1 md:ring-[#006c49]/20 lg:h-[360px] dark:md:bg-surface-elevated dark:md:ring-border/40">
                <ThemedSectionImage
                  image={{
                    type: "single",
                    src: "/aboutventrapos/featureSummary.png",
                    alt: "VentraPOS platform features overview on laptop",
                  }}
                  priority
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#003527]/50 to-transparent md:hidden"
                />
              </div>

              <div className="border-t border-white/10 px-5 py-5 sm:px-6 sm:py-7 md:order-2 md:rounded-[2.5rem] md:border-0 md:bg-gradient-to-br md:from-[#003527] md:to-[#006c49] md:p-8 md:shadow-[0_16px_40px_-12px_rgba(0,53,39,0.35)] md:ring-1 md:ring-[#006c49]/40 lg:p-10">
                <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold leading-tight text-white sm:text-xl lg:text-2xl">
                  Our Story
                </h2>
                <div className="space-y-4 text-[14px] leading-[1.65] text-white/90 sm:text-[15px] lg:text-base lg:leading-relaxed">
                  <p>
                    VentraPOS was created with a simple goal: to make powerful business
                    management tools accessible to businesses of all sizes.
                  </p>
                  <p>
                    Many businesses struggle with manual record keeping, inventory tracking,
                    sales monitoring, and financial management. VentraPOS was built to
                    eliminate these challenges by providing a smart, centralized platform that
                    simplifies daily operations and helps businesses make informed decisions.
                  </p>
                  <p>
                    Today, VentraPOS continues to evolve with modern technology, helping
                    businesses operate more efficiently, reduce errors, and focus on growth.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Our Features */}
      <section className="border-y border-border/40 bg-[#f0faf6]/60 py-12 dark:bg-[#003527]/10 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionHeading title="Our Features" centered />
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Everything you need to run your business, from sales and inventory to
              suppliers, expenses, customers, and actionable insights.
            </p>
          </div>

          <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {featureItems.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </ul>
        </div>
      </section>

      {/* Why Businesses Choose VentraPOS */}
      <section className="border-t border-border/40 bg-muted/30 py-12 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Why Businesses Choose VentraPOS" centered />

          <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {whyChooseItems.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </ul>
        </div>
      </section>

      {/* Closing Statement */}
      <section className="relative overflow-hidden bg-[#003527] px-4 py-14 text-center text-white sm:px-6 sm:py-20 lg:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#006c49_0%,transparent_55%)] opacity-20"
        />
        <div className="relative z-10 mx-auto max-w-2xl lg:max-w-3xl">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-[clamp(1.5rem,5.5vw,2.25rem)] font-semibold leading-tight sm:mb-6 lg:text-4xl">
            More than a POS system. VentraPOS is your smart business companion.
          </h2>
          <p className="text-[15px] leading-relaxed text-white/85 sm:text-lg">
            Helping businesses streamline operations, improve decision-making, and grow with
            confidence.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
