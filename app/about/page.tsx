import { SiteHeader } from "@/app/components/landing/site-header";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { Globe, SmartphoneNfc, PieChart, Users } from "lucide-react";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about LetsCode, the team behind VentraPOS. We build innovative technology solutions to help businesses transform and grow.",
};

const aboutSections = [
  {
    title: "Who We Are",
    description:
      "LetsCode is a technology solutions company dedicated to building innovative and scalable digital products for businesses and organizations. Our mission is to help clients transform their ideas into powerful technological solutions that solve real-world problems and improve efficiency.",
    icon: Globe,
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "What We Do",
    description:
      "We specialize in web and mobile application development, intelligent data-driven systems powered by AI and Machine Learning, and reliable software solutions tailored to meet the specific needs of our clients.",
    icon: SmartphoneNfc,
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Our Innovations",
    description:
      "In addition to delivering customized solutions, LetsCode is developing innovative digital products that create impact across industries. Optimedix and Orin, developed by our co-founder, reflect our commitment to innovation and technological advancement.",
    icon: PieChart,
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Our Philosophy",
    description:
      "At LetsCode, we believe technology should empower businesses and communities. Through collaboration, creativity, and technical excellence, we deliver solutions that help organizations grow, operate smarter, and stay competitive in a rapidly evolving digital world.",
    icon: Users,
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32 border-b border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#006c49_0%,transparent_40%)] opacity-[0.05] dark:opacity-20" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-6 inline-flex rounded-full border border-[#006c49]/20 bg-[#003527]/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#6ffbbe]">
            About LetsCode
          </div>
          <h1 className="mb-8 font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Building Technology, Driving Innovation
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground">
            LetsCode helps businesses transform ideas into scalable digital solutions, empowering growth and efficiency.
          </p>
        </div>
      </section>

      {/* About Sections with Zig-Zag Layout */}
      <section className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
          {aboutSections.map((section, idx) => {
            const Icon = section.icon;
            const isEven = idx % 2 !== 0; // alternate layout
            return (
              <div
                key={idx}
                className={`grid gap-10 lg:grid-cols-2 items-center ${
                  isEven ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Image */}
                <div className="relative w-full h-80 lg:h-[360px] rounded-3xl overflow-hidden shadow-lg">
                  <Image
                    src={section.image}
                    alt={section.title}
                    fill
                    className="object-cover transition-transform hover:scale-105 duration-500"
                  />
                </div>

                {/* Text Card */}
                <div className="rounded-[2.5rem] bg-gradient-to-b from-[#003527]/30 to-[#006c49]/20 p-10 ring-1 ring-[#006c49]/30 shadow-sm transition-transform hover:-translate-y-2 hover:shadow-lg">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#006c49]/10 text-[#6ffbbe] transition-colors hover:bg-[#6ffbbe] hover:text-[#002118]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4 font-[family-name:var(--font-display)] text-foreground">{section.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{section.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#003527] text-white text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-4xl font-[family-name:var(--font-display)] font-semibold">
            Ready to Innovate With Us?
          </h2>
          <p className="mb-8 text-lg max-w-2xl mx-auto">
            LetsCode is always looking for collaboration, innovation, and visionary ideas. Let’s build the future together.
          </p>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-br from-[#006c49] to-[#003527] px-8 text-[15px] font-medium text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110"
          >
            Contact Us
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}