import Link from "next/link";

export function SidebarBrand({
  onNavigate,
  isCollapsed = false,
}: {
  onNavigate?: () => void;
  isCollapsed?: boolean;
}) {
  return (
    <Link
      href="/dashboard"
      onClick={() => onNavigate?.()}
      className="tap-target flex min-w-0 items-center gap-3 px-1 py-2 transition-all hover:opacity-90"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#006c49] text-white shadow-sm dark:bg-[#6ffbbe] dark:text-[#003527]">
        <span className="text-[16px] font-black italic tracking-tighter">V</span>
      </div>
      {!isCollapsed && (
        <span className="truncate font-[family-name:var(--font-display)] text-[17px] font-bold tracking-tight text-foreground transition-all animate-in fade-in slide-in-from-left-2 duration-300">
          VentraPOS
        </span>
      )}
    </Link>
  );
}
