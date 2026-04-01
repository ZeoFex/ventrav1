"use client";

import { SiteHeader } from "../components/landing/site-header";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { SiteFooter } from "../components/landing/site-footer";

const BlogPost = [
  {
    title: "Money",
    description:
      "Understanding money is the foundation of every successful business. Learn how to manage, grow, and multiply your finances effectively.",
    imageUrl:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop",
    Author: "Felix Owusu",
    createdAt: "26 Mar 2026",
  },
  {
    title: "Growth",
    description:
      "Business growth is not accidental. Discover strategies that help you scale sustainably and dominate your market.",
    imageUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop",
    Author: "Felix Owusu",
    createdAt: "21 Mar 2026",
  },
  {
    title: "Discipline",
    description:
      "Discipline is the hidden engine behind every great entrepreneur. Build systems that keep you consistent and focused.",
    imageUrl:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop",
    Author: "Felix Owusu",
    createdAt: "26 Mar 2026",
  },
];

export function BlogView() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <section className="relative overflow-hidden py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* HEADER */}
          <div className="mb-16 max-w-2xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-border/50 bg-secondary/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Blog
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight md:text-5xl lg:text-[56px] lg:leading-[1.1]">
              Insights for Modern Business
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Practical knowledge, financial clarity, and growth strategies 
              curated to help you build smarter and scale faster.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

            {BlogPost.map((blog, idx) => (
              <div
                key={idx}
                className="group relative cursor-pointer rounded-2xl border border-border/40 bg-card/40 overflow-hidden backdrop-blur-xl transition-all hover:bg-card/80 hover:border-border/80 dark:bg-white/[0.02] dark:border-white/5 dark:hover:bg-white/[0.04]"
              >
                {/* IMAGE */}
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={blog.imageUrl}
                    alt={blog.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* CONTENT */}
                <div className="p-6">
                  {/* META */}
                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{blog.Author}</span>
                    <span>{blog.createdAt}</span>
                  </div>

                  {/* TITLE */}
                  <h3 className="mb-3 text-[18px] font-semibold tracking-tight text-foreground">
                    {blog.title}
                  </h3>

                  {/* DESCRIPTION */}
                  <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                    {blog.description}
                  </p>

                  {/* READ MORE */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#006c49] transition-colors group-hover:text-[#003527] dark:text-[#6ffbbe]">
                      Read Article
                    </span>

                    <ArrowUpRight className="size-5 text-muted-foreground/50 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

export default function BlogPage() {
  return <BlogView />;
}