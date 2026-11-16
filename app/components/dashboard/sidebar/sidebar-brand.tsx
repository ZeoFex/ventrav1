import { BrandLockup } from "@/app/components/brand-mark";

export function SidebarBrand({
  onNavigate,
  isCollapsed = false,
}: {
  onNavigate?: () => void;
  isCollapsed?: boolean;
}) {
  return (
    <BrandLockup
      href="/dashboard"
      size={32}
      showWord={!isCollapsed}
      onClick={() => onNavigate?.()}
      className="tap-target px-1 py-2 transition-opacity hover:opacity-90"
      wordClassName="text-[17px] font-bold animate-in fade-in slide-in-from-left-2 duration-300"
    />
  );
}
