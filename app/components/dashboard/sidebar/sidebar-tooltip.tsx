"use client";

import { useState } from "react";

interface SidebarTooltipProps {
  label: string;
  active: boolean;
  children: React.ReactNode;
}

export function SidebarTooltip({ label, active, children }: SidebarTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!active) return <>{children}</>;

  return (
    <div 
      className="relative flex w-full"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <div className="fixed left-[5.5rem] z-[100] ml-2 px-3 py-1.5 bg-[#006c49] dark:bg-[#6ffbbe] text-white dark:text-[#003527] text-[12px] font-bold rounded-lg shadow-xl shadow-black/20 animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200 pointer-events-none whitespace-nowrap self-center">
          {label}
          {/* Small Caret */}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-[#006c49] dark:bg-[#6ffbbe] rotate-45" />
        </div>
      )}
    </div>
  );
}
