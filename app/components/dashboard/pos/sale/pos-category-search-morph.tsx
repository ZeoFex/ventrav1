"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type PosCategorySearchMorphProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PosCategorySearchMorph({
  value: query,
  onChange,
}: PosCategorySearchMorphProps) {
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const close = useCallback(() => {
    setExpanded(false);
    onChange("");
    inputRef.current?.blur();
  }, [onChange]);

  useEffect(() => {
    if (!expanded) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 45);
    return () => window.clearTimeout(t);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, close]);

  return (
    <div className="flex min-w-0 w-full max-w-full justify-stretch sm:ml-auto sm:w-auto sm:max-w-md sm:justify-end">
      <div
        ref={wrapRef}
        className={`relative flex h-10 overflow-hidden border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[max-width,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[max-width] focus-within:border-[#006c49]/35 focus-within:ring-2 focus-within:ring-[#006c49]/12 dark:border-white/[0.1] dark:bg-[#141414] dark:focus-within:border-[#6ffbbe]/35 dark:focus-within:ring-[#6ffbbe]/12 ${
          expanded
            ? "h-10 min-w-0 max-w-[min(100%,28rem)] flex-1 rounded-xl shadow-sm dark:shadow-none"
            : "size-10 shrink-0 cursor-pointer rounded-full"
        }`}
        onClick={(e) => {
          if (!expanded) {
            e.preventDefault();
            setExpanded(true);
          }
        }}
        onKeyDown={(e) => {
          if (!expanded && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setExpanded(true);
          }
        }}
        role={expanded ? undefined : "button"}
        tabIndex={expanded ? -1 : 0}
        aria-expanded={expanded}
        aria-controls={expanded ? inputId : undefined}
        aria-label="Search products"
      >
        <label htmlFor={inputId} className="sr-only">
          Search products
        </label>
        <div
          className={`flex h-full items-center transition-[padding,gap] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            expanded
              ? "min-w-0 flex-1 gap-2.5 px-3"
              : "w-full justify-center px-0"
          }`}
        >
          <Search
            className="size-[18px] shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            id={inputId}
            ref={inputRef}
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            className={`min-w-0 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/85 transition-[opacity,margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              expanded
                ? "ml-0 w-full flex-1 opacity-100"
                : "ml-0 w-0 opacity-0 pointer-events-none"
            }`}
            onClick={(e) => e.stopPropagation()}
            tabIndex={expanded ? 0 : -1}
          />
        </div>
      </div>
    </div>
  );
}
