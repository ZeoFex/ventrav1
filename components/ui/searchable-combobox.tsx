"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
    value: string;
    label: string;
};

type SearchableComboboxProps = {
    id?: string;
    label?: string;
    placeholder?: string;
    emptyMessage?: string;
    createLabel?: (query: string) => string;
    value: string | null;
    onValueChange: (value: string | null, option?: ComboboxOption) => void;
    options: ComboboxOption[];
    onSearch?: (query: string) => void;
    onCreate?: (name: string) => Promise<ComboboxOption | null>;
    isLoading?: boolean;
    disabled?: boolean;
    allowClear?: boolean;
    clearLabel?: string;
    debounceMs?: number;
};

export function SearchableCombobox({
    id,
    label,
    placeholder = "Search…",
    emptyMessage = "No results found.",
    createLabel = (q) => `Create "${q}"`,
    value,
    onValueChange,
    options,
    onSearch,
    onCreate,
    isLoading = false,
    disabled = false,
    allowClear = false,
    clearLabel = "None",
    debounceMs = 200,
}: SearchableComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [creating, setCreating] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selected = options.find((o) => o.value === value);

    React.useEffect(() => {
        if (!onSearch) return;
        const t = window.setTimeout(() => onSearch(query), debounceMs);
        return () => window.clearTimeout(t);
    }, [query, onSearch, debounceMs]);

    React.useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = React.useMemo(() => {
        if (onSearch) return options;
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query, onSearch]);

    const showCreate =
        onCreate &&
        query.trim().length > 0 &&
        !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

    async function handleCreate() {
        if (!onCreate || !query.trim() || creating) return;
        setCreating(true);
        try {
            const created = await onCreate(query.trim());
            if (created) {
                onValueChange(created.value, created);
                setQuery("");
                setOpen(false);
            }
        } finally {
            setCreating(false);
        }
    }

    return (
        <div ref={containerRef} className="relative space-y-2">
            {label ? (
                <label htmlFor={id} className="text-sm font-semibold ml-1">
                    {label}
                </label>
            ) : null}
            <button
                id={id}
                type="button"
                disabled={disabled}
                onClick={() => {
                    setOpen((o) => !o);
                    window.setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-transparent p-3 text-left text-[15px] outline-none transition-all",
                    "focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 dark:border-white/10",
                    disabled && "opacity-50 cursor-not-allowed",
                )}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className={cn(!selected && "text-muted-foreground")}>
                    {selected?.label ?? placeholder}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-white shadow-lg dark:border-white/10 dark:bg-[#111]">
                    <Command shouldFilter={false} className="flex flex-col">
                        <div className="flex items-center border-b border-border px-3 dark:border-white/10">
                            <Command.Input
                                ref={inputRef}
                                value={query}
                                onValueChange={setQuery}
                                placeholder={placeholder}
                                className="flex h-11 w-full bg-transparent py-3 text-[14px] outline-none placeholder:text-muted-foreground"
                            />
                            {isLoading || creating ? (
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            ) : null}
                        </div>
                        <Command.List className="max-h-60 overflow-y-auto p-1">
                            <Command.Empty className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                                {emptyMessage}
                            </Command.Empty>

                            {allowClear && (
                                <Command.Item
                                    value="__clear__"
                                    onSelect={() => {
                                        onValueChange(null);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] aria-selected:bg-muted"
                                >
                                    <span className="text-muted-foreground">{clearLabel}</span>
                                </Command.Item>
                            )}

                            {filtered.map((option) => (
                                <Command.Item
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => {
                                        onValueChange(option.value, option);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] aria-selected:bg-muted"
                                >
                                    <Check
                                        className={cn(
                                            "size-4 shrink-0",
                                            value === option.value ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                    {option.label}
                                </Command.Item>
                            ))}

                            {showCreate && (
                                <Command.Item
                                    value={`__create__${query}`}
                                    onSelect={handleCreate}
                                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] text-[#006c49] aria-selected:bg-[#006c49]/10 dark:text-[#6ffbbe]"
                                >
                                    <Plus className="size-4 shrink-0" />
                                    {createLabel(query.trim())}
                                </Command.Item>
                            )}
                        </Command.List>
                    </Command>
                </div>
            )}
        </div>
    );
}
