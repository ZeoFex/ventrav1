"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "motion/react";
import {
    Search,
    FileText,
    Package,
    Users,
    UserCircle,
    Command as CommandIcon,
    ChevronRight,
    Zap
} from "lucide-react";

import { DASHBOARD_NAV_ITEMS } from "../sidebar/dashboard-nav-config";
import { useProducts } from "../products/products-data-hooks";
// import { MOCK_CUSTOMERS } from "../customers/customers-mock-data";
// import { MOCK_STAFF } from "../staff/staff-mock-data";

type CommandPaletteProps = {
    isOpen: boolean;
    onClose: () => void;
};

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const router = useRouter();
    const { products = [] } = useProducts(isOpen);

    // Handle ESC to close
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [onClose]);

    const runCommand = React.useCallback(
        (command: () => void) => {
            onClose();
            command();
        },
        [onClose]
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] p-4 sm:p-6 md:p-20">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-[#eef0f2] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111]"
                    >
                        <Command className="flex h-full w-full flex-col overflow-hidden">
                            <div className="flex items-center border-b border-[#f0f2f4] px-4 dark:border-white/[0.06]">
                                <Search className="mr-3 size-5 text-muted-foreground" strokeWidth={2} />
                                <Command.Input
                                    autoFocus
                                    placeholder="Search pages, products..."
                                    className="flex h-14 w-full bg-transparent py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60"
                                />
                                <div className="flex items-center gap-1.5 rounded-lg border border-[#eef0f2] bg-[#fafafa] px-2 py-1 text-[11px] font-medium text-muted-foreground dark:border-white/5 dark:bg-white/5">
                                    <span className="text-[10px]">ESC</span>
                                </div>
                            </div>

                            <Command.List className="max-h-[70vh] overflow-y-auto p-2 custom-scrollbar focus:outline-none">
                                <Command.Empty>
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                        <div className="mb-4 rounded-2xl bg-[#f4f5f7] p-4 dark:bg-white/5">
                                            <Search className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
                                        </div>
                                        <p className="text-[15px] font-medium text-foreground">No matches found</p>
                                    </div>
                                </Command.Empty>

                                <Command.Group heading={<span className="px-2 mb-2 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Navigation</span>}>
                                    {DASHBOARD_NAV_ITEMS.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <CommandItem
                                                onSelect={() => runCommand(() => router.push(item.href))}
                                                icon={<FileText className="size-4" />}
                                                label={item.label}
                                                shortcut={item.id.charAt(0).toUpperCase()}
                                            />
                                            {item.children?.map((child) => (
                                                <CommandItem
                                                    key={child.id}
                                                    onSelect={() => runCommand(() => router.push(child.href))}
                                                    icon={<ChevronRight className="size-4" />}
                                                    label={`${item.label} > ${child.label}`}
                                                    className="ml-4 opacity-80"
                                                />
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </Command.Group>

                                <Command.Group heading={<span className="px-2 mt-4 mb-2 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Products</span>}>
                                    {products.slice(0, 10).map((product: any) => (
                                        <CommandItem
                                            key={product.id}
                                            onSelect={() => runCommand(() => router.push(`/dashboard/products/${product.id}/edit`))}
                                            icon={<Package className="size-4" />}
                                            label={product.name}
                                            description={`SKU: ${product.sku} • GHS ${Number(product.priceGhs).toFixed(2)}`}
                                        />
                                    ))}
                                </Command.Group>

                                {/* Customers and Staff will be added later when their APIs are ready */}
                            </Command.List>

                            <div className="flex items-center justify-between border-t border-[#f0f2f4] bg-[#fafafa] px-4 py-3 text-[11px] text-muted-foreground dark:border-white/[0.06] dark:bg-[#141414]">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5 text-foreground/70">
                                        <Zap className="size-3 text-[#006c49] dark:text-[#6ffbbe]" strokeWidth={2.5} />
                                        Instant Search Active
                                    </span>
                                </div>
                            </div>
                        </Command>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function CommandItem({
    onSelect,
    icon,
    label,
    description,
    shortcut,
    className = ""
}: {
    onSelect: () => void;
    icon: React.ReactNode;
    label: string;
    description?: string;
    shortcut?: string;
    className?: string;
}) {
    return (
        <Command.Item
            onSelect={onSelect}
            className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-[14px] outline-none aria-selected:bg-[#006c49]/5 aria-selected:text-[#006c49] dark:aria-selected:bg-[#6ffbbe]/10 dark:aria-selected:text-[#6ffbbe] transition-colors ${className}`}
        >
            <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f4f5f7] text-muted-foreground group-aria-selected:bg-white group-aria-selected:text-inherit dark:bg-white/5 dark:group-aria-selected:bg-white/10">
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="font-medium">{label}</span>
                    {description && <span className="text-[12px] text-muted-foreground group-aria-selected:text-inherit/70">{description}</span>}
                </div>
            </div>
            {shortcut && (
                <span className="text-[11px] font-medium text-muted-foreground/50 opacity-0 group-aria-selected:opacity-100 transition-opacity">
                    {shortcut}
                </span>
            )}
        </Command.Item>
    );
}
