import { useState, useEffect } from "react";
import { Search, ScanBarcode } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { GlobalBarcodeModal } from "./global-barcode-modal";

export function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <div className="flex w-full min-w-0 max-w-md items-center gap-2 lg:max-w-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex h-10 flex-1 min-w-0 items-center gap-3 rounded-xl border border-[#bfc9c3]/25 bg-background px-3 text-sm text-muted-foreground outline-none transition-all hover:border-[#006c49]/40 hover:bg-surface-elevated dark:border-white/[0.1] dark:bg-[#141414] dark:hover:border-[#6ffbbe]/35"
        >
          <Search
            className="size-[1.125rem] transition-colors group-hover:text-foreground"
            strokeWidth={1.75}
          />
          <span className="flex-1 text-left">Search</span>
          <kbd className="hidden items-center gap-1 rounded-lg border border-[#bfc9c3]/20 bg-[#fafafa] px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors group-hover:border-[#006c49]/30 group-hover:bg-white sm:flex dark:border-white/10 dark:bg-white/5 dark:group-hover:border-[#6ffbbe]/30 dark:group-hover:bg-white/10">
            <span className="text-[12px] leading-none opacity-60">⌘</span>
            <span className="leading-none">K</span>
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setIsScanOpen(true)}
          className="flex flex-shrink-0 h-10 w-10 items-center justify-center rounded-xl border border-[#bfc9c3]/25 bg-background text-muted-foreground outline-none transition-all hover:border-[#006c49]/40 hover:bg-surface-elevated hover:text-foreground dark:border-white/[0.1] dark:bg-[#141414] dark:hover:border-[#6ffbbe]/35"
          aria-label="Scan barcode"
        >
          <ScanBarcode className="size-[1.125rem]" strokeWidth={1.75} />
        </button>
      </div>

      <CommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <GlobalBarcodeModal isOpen={isScanOpen} onClose={() => setIsScanOpen(false)} />
    </>
  );
}
