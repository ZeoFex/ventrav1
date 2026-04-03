"use client";

import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
} from "lucide-react";
import { SiteHeader } from "../components/landing/site-header";
import { SiteFooter } from "../components/landing/site-footer";
import { useState } from "react";
import { toast } from "sonner";
import { submitContactForm } from "./actions";

export function ContactView() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await submitContactForm(formData);

      if (result.success) {
        toast.success(result.message);
        setFormData({
          fullName: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
<div className="flex min-h-screen flex-col bg-background"> 
    <SiteHeader />
    <section className="relative overflow-hidden bg-background py-24 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-16 max-w-2xl">
          <div className="mb-6 inline-flex w-fit items-center rounded-full border border-border/50 bg-secondary/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl lg:text-[45px] lg:leading-[1.1]">
            Let’s Talk About Your Business
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Reach out to LetsCode for services, support, or collaborations.
            We respond with precision and clarity.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="grid gap-10 lg:grid-cols-2 items-start">

          {/* LEFT PANEL */}
          <div className="flex flex-col gap-6">

            {/* INFO CARD */}
            <div className="rounded-2xl border border-border/40 bg-card/40 p-6 backdrop-blur-xl dark:bg-white/[0.02] dark:border-white/5">

              <h3 className="text-xl font-semibold mb-2">
                Contact Information
              </h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Available anytime to support your needs.
              </p>

              <div className="flex flex-col gap-5">

                {/* ITEM */}
                <div className="flex items-start gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/60 dark:bg-white/10">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      Abuakwa-Tanoso, Despite & Kessben Street
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/60 dark:bg-white/10">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      letsCode6996@gmail.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/60 dark:bg-white/10">
                    <Phone className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">
                      +233 (242)-975-(483)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/60 dark:bg-white/10">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">Working Hours</p>
                    <p className="text-sm text-muted-foreground">
                      Monday – Saturday: 24/7
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MAP (GLASS STYLE) */}
            <div className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden backdrop-blur-xl dark:bg-white/[0.02] dark:border-white/5">
              <iframe
                src="https://maps.google.com/maps?q=kumasi&t=&z=13&ie=UTF8&iwloc=&output=embed"
                className="w-full h-[250px]"
                loading="lazy"
              ></iframe>
            </div>
          </div>

          {/* RIGHT PANEL (FORM) */}
          <div className="rounded-2xl border border-border/40 bg-card/40 p-8 backdrop-blur-xl dark:bg-white/[0.02] dark:border-white/5">

            <h3 className="text-2xl font-semibold mb-2">
              Send a Message
            </h3>

            <p className="text-muted-foreground mb-8 text-sm">
              Tell us about your needs and we’ll respond quickly.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                className="h-12 rounded-lg bg-background px-4 text-sm outline outline-1 outline-border/30 focus:outline-[#95d3ba] focus:ring-2 focus:ring-[#95d3ba]/30 transition"
              />

              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                className="h-12 rounded-lg bg-background px-4 text-sm outline outline-1 outline-border/30 focus:outline-[#95d3ba] focus:ring-2 focus:ring-[#95d3ba]/30 transition"
              />

              <input
                type="text"
                name="subject"
                required
                value={formData.subject}
                onChange={handleChange}
                placeholder="Subject"
                className="h-12 rounded-lg bg-background px-4 text-sm outline outline-1 outline-border/30 focus:outline-[#95d3ba] focus:ring-2 focus:ring-[#95d3ba]/30 transition"
              />

              <textarea
                name="message"
                required
                rows={5}
                value={formData.message}
                onChange={handleChange}
                placeholder="Your Message"
                className="rounded-lg bg-background px-4 py-3 text-sm outline outline-1 outline-border/30 focus:outline-[#95d3ba] focus:ring-2 focus:ring-[#95d3ba]/30 transition"
              />

              {/* CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] px-8 text-[15px] font-medium text-white shadow-[0_24px_48px_-12px_rgba(0,53,39,0.18)] transition-[filter] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
                {!isSubmitting && <Send className="size-4" />}
              </button>
            </form>
          </div>

        </div>
      </div>
    </section>
    <SiteFooter />
</div>
  );
}

export default function ContactPage() {
  return <ContactView />;
}