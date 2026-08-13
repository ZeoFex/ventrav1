"use client";

import { Search } from "lucide-react";
import { useId } from "react";

type PosCategorySearchMorphProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PosCategorySearchMorph({
  value: query,
  onChange,
}: PosCategorySearchMorphProps) {
  const inputId = useId();

  return (
    <div className="relative flex h-10 w-full min-w-0 items-center gap-2.5 rounded-full border border-[#e5e7eb] bg-white px-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] focus-within:border-[#006c49]/40 focus-within:ring-2 focus-within:ring-[#006c49]/12 dark:border-white/[0.1] dark:bg-[#141414] dark:shadow-none dark:focus-within:border-[#6ffbbe]/35 dark:focus-within:ring-[#6ffbbe]/12">
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <Search
        className="size-[1.125rem] shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        placeholder="Search products…"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/85"
        aria-label="Search products"
        autoComplete="off"
      />
    </div>
  );
}
