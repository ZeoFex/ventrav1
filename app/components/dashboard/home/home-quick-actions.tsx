import Link from "next/link";
import { ArrowUpRight, ScanLine, Wallet } from "lucide-react";

interface QuickAction {
  href: string;
  label: string;
  hint: string;
  icon: any;
  comingSoon?: boolean;
}

const actions: QuickAction[] = [
  {
    href: "/dashboard/pos/sale",
    label: "New sale",
    hint: "Open checkout",
    icon: ScanLine,
  },
  {
    href: "/dashboard/pos/register",
    label: "Open register",
    hint: "Start shift",
    icon: Wallet,
    comingSoon: true,
  },
] as const;

export function HomeQuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {actions.map(({ href, label, hint, icon: Icon, comingSoon }) => {
        const Content = (
          <div className="flex min-w-0 items-center justify-between gap-4 w-full">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#bfc9c3]/15 bg-surface-elevated text-muted-foreground dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{label}</p>
                  {comingSoon && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wider">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground">{hint}</p>
              </div>
            </div>
            {!comingSoon && (
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                strokeWidth={2}
                aria-hidden
              />
            )}
          </div>
        );

        if (comingSoon) {
          return (
            <div
              key={href}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#bfc9c3]/10 bg-surface-card/50 px-4 py-4 dark:border-white/[0.03] dark:bg-[#111]/50 cursor-not-allowed opacity-70"
            >
              {Content}
            </div>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-[#bfc9c3]/15 bg-surface-card px-4 py-4 transition-[border-color,box-shadow,background-color] duration-200 hover:border-[#bfc9c3]/30 hover:bg-surface-elevated dark:border-white/[0.06] dark:bg-[#111] dark:hover:border-white/[0.1] dark:hover:bg-[#161616]"
          >
            {Content}
          </Link>
        );
      })}
    </div>
  );
}
