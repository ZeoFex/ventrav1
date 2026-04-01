import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { Users, FileText, Globe, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers & Collaboration",
  description: "Join the LetsCode team or collaborate with us as a contractor or partner. We're building the future of retail and business technology.",
};

const collaborationTypes = [
  {
    title: "Individual Collaborators",
    description:
      "Developers, designers, and marketers who want to build innovative products with us. Bring your skills and ideas to the table.",
    icon: Users,
  },
  {
    title: "Contractors & Agencies",
    description:
      "Partner with us on project-based engagements. We value expertise in software, UX, and product strategy.",
    icon: FileText,
  },
  {
    title: "Companies & Partners",
    description:
      "Small and large businesses looking for tailored solutions. Let's create products that scale and deliver impact.",
    icon: Globe,
  },
];

const expertiseAreas = [
  "Point of Sale (POS) — Lightning fast checkout and payment processing",
  "Inventory & Products — Real-time stock tracking and automated alerts",
  "Digital & Printed Receipts — Professional receipts, print or digital",
  "Staff Management — Role-based access and secure shift handovers",
  "Reporting & Dashboards — Visualize sales trends and profit margins",
  "Customer Records — Centralized database for loyal customers",
  "Expense Tracking — Track operational costs and net profitability",
  "Multi-Location Support — Expand with centralized control",
];

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#006c49_0%,transparent_40%)] opacity-[0.05] dark:opacity-20" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-6 inline-flex rounded-full border border-[#006c49]/20 bg-[#003527]/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#6ffbbe]">
            Join Our Team
          </div>
          <h1 className="mb-8 font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Collaborate With LetsCode
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground">
            We’re looking for talented individuals, contractors, and companies to join us in building versatile and scalable solutions. Let’s innovate together.
          </p>
        </div>
      </section>

      {/* Collaboration Cards */}
      <section className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)] sm:text-4xl">
              Who We Collaborate With
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Whether you're an individual, contractor, or a company, we welcome collaboration across all expertise levels.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {collaborationTypes.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-[2.5rem] bg-gradient-to-b from-[#003527]/30 to-[#006c49]/20 p-10 ring-1 ring-[#006c49]/30 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#006c49]/10 text-[#6ffbbe] transition-colors group-hover:bg-[#6ffbbe] group-hover:text-[#002118]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Expertise Areas */}
      <section className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)] sm:text-4xl">
              Our Expertise
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              LetsCode is versatile and able to create products across multiple domains. Here’s where we excel:
            </p>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {expertiseAreas.map((area, idx) => (
              <li
                key={idx}
                className="rounded-[2.5rem] bg-gradient-to-b from-[#003527]/30 to-[#006c49]/20 p-6 shadow-sm transition-all hover:shadow-md flex items-start gap-3"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#6ffbbe]" />
                <span className="text-sm font-medium text-foreground/90">{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#003527] text-white text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-4xl font-[family-name:var(--font-display)] font-semibold">
            Ready to Collaborate?
          </h2>
          <p className="mb-8 text-lg max-w-2xl mx-auto">
            LetsCode is versatile and ready to bring your ideas to life. Whether you are an individual, contractor, or company, let’s innovate together.
          </p>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-[#006c49] to-[#003527] px-8 text-[15px] font-medium text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110"
          >
            Get In Touch
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}