"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface FlyoutChild {
  id: string;
  label: string;
  href: string;
}

interface SidebarFlyoutProps {
  label: string;
  active: boolean;
  children: FlyoutChild[];
  pathname: string;
  onNavigate?: () => void;
  trigger: React.ReactNode;
}

export function SidebarFlyout({ 
  label, 
  active, 
  children, 
  pathname, 
  onNavigate,
  trigger 
}: SidebarFlyoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!active) return <>{trigger}</>;

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
  };

  return (
    <div 
      className="relative flex w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}
      
      {isOpen && (
        <div 
          className="fixed left-[5.5rem] z-[100] ml-2 w-56 rounded-2xl bg-surface-card border border-[#006c49]/20 dark:border-[#6ffbbe]/20 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200 overflow-hidden"
          style={{ alignSelf: 'center' }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#006c49]/05 dark:bg-[#6ffbbe]/05 border-b border-[#006c49]/10 dark:border-[#6ffbbe]/10">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#006c49] dark:text-[#6ffbbe]">
              {label}
            </span>
          </div>

          {/* List */}
          <div className="p-1.5 space-y-0.5">
            {children.map((child) => {
              const isActive = pathname === child.href;
              return (
                <Link
                  key={child.id}
                  href={child.href}
                  onClick={() => {
                    onNavigate?.();
                    setIsOpen(false);
                  }}
                  className={`flex items-center px-3 py-2 text-[13px] font-medium rounded-xl transition-colors ${
                    isActive 
                      ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]" 
                      : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Small Caret */}
          <div className="absolute top-6 -left-1.5 size-3 bg-surface-card border-l border-t border-[#006c49]/20 dark:border-[#6ffbbe]/20 rotate-[-45deg]" />
        </div>
      )}
    </div>
  );
}
