"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-2xl font-[family-name:var(--font-display)]">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-base">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="px-6 pb-6 overflow-y-auto">
            {children}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-2xl font-[family-name:var(--font-display)]">{title}</DrawerTitle>
          {description && (
            <DrawerDescription className="text-base">
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <ScrollArea className="px-4 pb-8 overflow-y-auto">
          {children}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
