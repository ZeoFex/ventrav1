"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, Users, Loader2 } from "lucide-react";
import { type CustomerRow } from "./customers-mock-data";
import { getCachedCustomers, cacheCustomers } from "@/app/lib/offline/offline-db";
import { useOnlineStatus } from "@/app/lib/offline/use-online-status";
import { ProductsPageShell } from "../products/products-page-shell";
import { useBranchContext } from "../branch-context";

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch data");
    }
    const data = await res.json();
    // Cache the fresh data for offline use
    await cacheCustomers(data).catch(console.error);
    return data;
  } catch (err) {
    // If the network request fails (offline or server error), fallback to DB
    const cached = await getCachedCustomers();
    if (cached && cached.length > 0) {
      console.warn("[Offline-First] Falling back to cached customers.", err);
      return cached;
    }
    throw err;
  }
};

function statusBadge(status: CustomerRow["status"]) {
  if (status === "inactive") {
    return (
      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#006c49]/12 px-2 py-0.5 text-[11px] font-semibold text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
      Active
    </span>
  );
}

export function CustomersListView() {
  const { branchId } = useBranchContext();
  const { data, isLoading, error } = useSWR<CustomerRow[]>(`/api/customers?b=${branchId}`, fetcher);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CustomerRow["status"]>("all");

  const filtered = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const q = query.trim().toLowerCase();

    return data.filter((c) => {
      if (status !== "all" && c.status !== status) return false;

      if (q) {
        const hit =
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q);

        if (!hit) return false;
      }

      return true;
    });
  }, [data, query, status]);

  if (error) {
    return (
      <ProductsPageShell title="Customers" description="Manage your customers and their contact details.">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-red-50 p-3 dark:bg-red-900/20">
            <Users className="size-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-foreground">Failed to load customers</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 text-[13px] font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
          >
            Try again
          </button>
        </div>
      </ProductsPageShell>
    );
  }

  if (isLoading) {
    return (
      <ProductsPageShell title="Customers" description="Manage your customers and their contact details.">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-[#006c49] dark:text-[#6ffbbe]" />
          <p className="mt-4 text-[14px] text-muted-foreground">Loading customers...</p>
        </div>
      </ProductsPageShell>
    );
  }

  const isGloballyEmpty = !data || data.length === 0;

  return (
    <ProductsPageShell
      title="Customers"
      description="Manage your customers and their contact details."
      actions={
        <Link
          href="/dashboard/customers/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] transition-[filter] hover:brightness-105 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
        >
          <Plus className="size-4" />
          Add customer
        </Link>
      }
    >
      {!isGloballyEmpty && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search name, phone or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 pl-10 pr-3 text-[14px] outline-none ring-[#006c49]/20 focus:border-[#006c49]/40 focus:ring-2 dark:border-white/[0.12] dark:bg-[#141414]"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "all" | CustomerRow["status"])
            }
            className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      {isGloballyEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-[#e5e7eb] bg-surface-card px-6 py-16 text-center dark:border-white/[0.12]">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#f4f5f7] dark:bg-[#1a1a1a]">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-foreground">
            No customers yet
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Add your first customer to start managing contacts.
          </p>

          <Link
            href="/dashboard/customers/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] hover:brightness-105"
          >
            <Plus className="size-4" />
            Add customer
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[1.25rem] border border-[#eef0f2] bg-surface-card px-6 py-14 text-center dark:border-white/[0.08]">
          <p className="text-[15px] font-medium text-foreground">
            No customers match these filters
          </p>
          <button
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
            className="mt-4 text-[13px] font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Mobile View: Cards */}
          <div className="grid gap-4 sm:hidden pb-10">
            {filtered.map((c) => {
              const initials = c.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-white p-5 dark:bg-[#111] dark:border-white/10 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="size-12 shrink-0 rounded-full bg-gradient-to-br from-[#003527] to-[#064e3b] flex items-center justify-center text-white text-[15px] font-bold shadow-lg">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/dashboard/customers/${c.id}/edit`} className="font-bold text-[16px] truncate hover:underline underline-offset-2">
                          {c.name}
                        </Link>
                        {statusBadge(c.status)}
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-0.5">{c.phone}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {c.email && (
                      <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-3 border dark:border-white/5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email Address</p>
                        <p className="text-[14px] font-medium truncate">{c.email}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Link 
                        href={`/dashboard/customers/${c.id}/edit`} 
                        className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-[#006c49]/5 text-[#006c49] text-[14px] font-bold hover:bg-[#006c49]/10 transition-colors"
                      >
                        Edit Profile
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden sm:block overflow-hidden rounded-[1.25rem] border border-[#eef0f2] bg-surface-card shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#111]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#f0f2f4] bg-[#fafafa] dark:border-white/[0.06] dark:bg-[#141414]">
                    <th className="px-4 py-3 font-semibold text-foreground">Name</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Phone</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Email</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 font-semibold text-foreground text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.06]">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[#fafafa]/80 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <Link href={`/dashboard/customers/${c.id}/edit`} className="hover:underline">
                          {c.name}
                        </Link>
                      </td>

                      <td className="px-4 py-3 text-foreground">{c.phone}</td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {c.email ?? "—"}
                      </td>

                      <td className="px-4 py-3">{statusBadge(c.status)}</td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/customers/${c.id}/edit`}
                          className="text-[13px] font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </ProductsPageShell>
  );
}