"use client";

import ReactMarkdown from "react-markdown";

export function CopilotMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 text-[15px] leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        code: ({ className, children }) => {
          const inline = !className;
          if (inline) {
            return (
              <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[13px]">
                {children}
              </code>
            );
          }
          return (
            <code className="block overflow-x-auto rounded-lg border border-[#bfc9c3]/15 bg-[#0a0a0a]/5 p-3 font-mono text-[13px] dark:border-white/[0.08] dark:bg-[#1a1a1a]">
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
