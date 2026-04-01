import { ChevronDown, User, Shield, CreditCard, Building, LogOut, ExternalLink, HelpCircle } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useSession } from "../../auth/use-session";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function HeaderUserMenu({ displayName: propDisplayName }: { displayName?: string }) {
  const { user, isLoading } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = propDisplayName || user?.name || "User";
  const initials = initialsFromName(displayName);
  const roleDisplay = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : "Staff";

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, close]);

  if (isLoading) {
    return (
      <div className="flex size-10 items-center justify-center rounded-full bg-surface-elevated animate-pulse" />
    );
  }

  return (
    <div className="relative flex shrink-0 items-center justify-end" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`tap-target flex min-w-0 items-center gap-1.5 rounded-xl py-1 pl-0.5 pr-1.5 text-left transition-all sm:gap-3 sm:pl-1 sm:pr-3 ${isOpen ? "bg-surface-elevated ring-1 ring-[#bfc9c3]/20 dark:bg-[#1a1a1a] dark:ring-white/10" : "hover:bg-surface-elevated dark:hover:bg-[#1a1a1a]"
          }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="relative shrink-0">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="size-10 rounded-full object-cover shadow-sm sm:size-10"
            />
          ) : (
            <span
              className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] text-[12px] font-semibold text-white shadow-sm sm:size-10 sm:text-[13px]"
              aria-hidden
            >
              {initials}
            </span>
          )}
          <span
            className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-surface-card bg-[#006c49] dark:border-[#0a0a0a] dark:bg-[#22c55e]"
            title="Online"
            aria-label="Online"
          />
        </span>
        <span className="hidden min-w-0 flex-col sm:flex">
          <span className="truncate text-[14px] font-medium text-foreground">
            {displayName}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">{roleDisplay}</span>
        </span>
        <ChevronDown
          className={`hidden size-4 shrink-0 text-muted-foreground transition-transform duration-200 sm:block ${isOpen ? "rotate-180" : ""
            }`}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-[#bfc9c3]/20 bg-surface-card p-1.5 shadow-2xl dark:border-white/[0.08] dark:bg-[#0a0a0a] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="flex items-center gap-3 px-3 py-3 sm:hidden border-b border-[#bfc9c3]/10 dark:border-white/[0.06] mb-1">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <div className="size-10 rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] flex items-center justify-center text-[12px] font-semibold text-white">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-[12px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {user?.role === "owner" && (
              <>
                <div className="space-y-0.5">
                  <MenuItem
                    href="/dashboard/settings/account"
                    icon={<User className="size-4" />}
                    label="Account Settings"
                    onClick={close}
                  />
                  <MenuItem
                    href="/dashboard/settings/security"
                    icon={<Shield className="size-4" />}
                    label="Security & Login"
                    onClick={close}
                  />
                </div>

                <div className="my-1.5 h-px bg-[#bfc9c3]/10 dark:bg-white/[0.06]" />

                <div className="space-y-0.5">
                  <MenuItem
                    href="/dashboard/settings/profile"
                    icon={<Building className="size-4" />}
                    label="Business Profile"
                    onClick={close}
                  />
                  <MenuItem
                    href="/dashboard/settings/billing"
                    icon={<CreditCard className="size-4" />}
                    label="Billing & Plans"
                    onClick={close}
                  />
                </div>

                <div className="my-1.5 h-px bg-[#bfc9c3]/10 dark:bg-white/[0.06]" />
              </>
            )}

            <div className="space-y-0.5">
              <MenuItem
                href="/dashboard/support"
                icon={<HelpCircle className="size-4" />}
                label="Support & Help"
                onClick={close}
              />
              <MenuItem
                icon={<LogOut className="size-4" />}
                label="Sign Out"
                variant="danger"
                onClick={async () => {
                  close();
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/login";
                  } catch (error) {
                    console.error("Logout failed", error);
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  variant = "default",
  onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "danger";
  onClick?: () => void;
}) {
  const baseClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors outline-none text-left";
  const variants = {
    default: "text-foreground hover:bg-surface-elevated dark:hover:bg-white/[0.05]",
    danger: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
  };

  const content = (
    <>
      <span className="flex shrink-0 text-muted-foreground group-hover:text-inherit">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {href?.startsWith("http") && <ExternalLink className="size-3 opacity-40" />}
    </>
  );

  if (!href) {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} ${variants[variant]}`} role="menuitem">
        {content}
      </button>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={`${baseClass} ${variants[variant]}`} role="menuitem">
      {content}
    </Link>
  );
}
