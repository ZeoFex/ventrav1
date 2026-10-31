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
    <div className="relative flex h-9 w-full min-w-0 items-center gap-2 rounded-full border border-[#d7ddd9] bg-white px-2.5 transition-[border-color,box-shadow] focus-within:border-[#006c49]/40 dark:border-white/[0.1] dark:bg-[#141414] dark:focus-within:border-[#6ffbbe]/35 sm:h-10 sm:gap-2.5 sm:border-[#e5e7eb] sm:px-3 sm:shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:focus-within:ring-2 sm:focus-within:ring-[#006c49]/12 dark:sm:shadow-none dark:sm:focus-within:ring-[#6ffbbe]/12">
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
