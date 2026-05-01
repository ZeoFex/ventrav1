"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

/** Best-effort: turn bare slugs into `/help/...` paths (model output sometimes omits the prefix). */
function normalizeMarkdownHref(href: string): string {
    const t = href.trim();
    if (!t) return t;
    if (t.startsWith("/") || t.startsWith("#") || /^https?:\/\//i.test(t) || t.startsWith("mailto:")) {
        return t;
    }
    if (/^help\//i.test(t)) {
        return `/${t.replace(/^\/+/, "")}`;
    }
    // Bare slug segment from the KB corpus
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(t)) {
        return `/help/${t}`;
    }
    return t;
}

const markdownComponents: Components = {
    a({ href, children, className }) {
        const raw = typeof href === "string" ? href : "";
        const resolved = normalizeMarkdownHref(raw);
        const merged = cn(
            "relative z-[1] cursor-pointer font-medium text-[#006c49] underline decoration-[#006c49]/55 underline-offset-2 hover:decoration-[#006c49] dark:text-[#6ffbbe] dark:decoration-[#6ffbbe]/55 dark:hover:decoration-[#6ffbbe]",
            className,
        );

        const internal = resolved.startsWith("/") && !resolved.startsWith("//");

        /** Scrollable dashboard regions sometimes intercept pointer gestures; keep link taps local. */
        const stopAncestorsInterceptingGesture = (
            e: React.MouseEvent | React.PointerEvent | React.TouchEvent,
        ) => {
            e.stopPropagation();
        };

        if (internal) {
            return (
                <Link
                    href={resolved}
                    prefetch={false}
                    className={merged}
                    onPointerDownCapture={stopAncestorsInterceptingGesture}
                    onMouseDownCapture={stopAncestorsInterceptingGesture}
                >
                    {children}
                </Link>
            );
        }

        return (
            <a
                href={resolved}
                className={merged}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDownCapture={stopAncestorsInterceptingGesture}
                onMouseDownCapture={stopAncestorsInterceptingGesture}
            >
                {children}
            </a>
        );
    },
};

export function HelpMarkdown({ content }: { content: string }) {
    return (
        <div
            className={cn(
                "prose prose-sm md:prose-base dark:prose-invert relative z-[1] max-w-none text-muted-foreground",
                "prose-headings:text-foreground prose-strong:text-foreground",
                "[&_a]:relative [&_a]:z-[1]",
            )}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
