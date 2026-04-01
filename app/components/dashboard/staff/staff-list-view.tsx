"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, Users, Loader2, Trash2 } from "lucide-react";
import useSWR from "swr";
import { ProductsPageShell } from "../products/products-page-shell";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StaffListView() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const { data: staff, mutate, isLoading } = useSWR<any[]>("/api/staff", fetcher);
  const { data: branches } = useSWR<any[]>("/api/branches", fetcher);

  const filtered = useMemo(() => {
    if (!staff) return [];
    if (!Array.isArray(staff)) return [];
    const q = query.trim().toLowerCase();

    return staff.filter((s) => {
      if (roleFilter !== "all" && s.roleName !== roleFilter) return false;
      if (branchFilter !== "all" && s.branchId !== branchFilter) return false;

      if (q) {
        const name = s.name || "";
        const email = s.email || "";
        const roleName = s.roleName || "";
        return (
          name.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q) ||
          roleName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [staff, query, roleFilter, branchFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this staff member?")) return;

    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        mutate();
      }
    } catch (err) {
      alert("Failed to delete staff");
    }
  }

  const isEmpty = !isLoading && (!staff || !Array.isArray(staff) || staff.length === 0);

  return (
    <ProductsPageShell
      title="Team Members"
      description={staff && Array.isArray(staff) ? `${staff.length} staff members` : "Manage your team"}
      actions={
        <Link
          href="/dashboard/staff/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] hover:brightness-105"
        >
          <Plus className="size-4" />
          Add Staff
        </Link>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-[#e5e7eb] bg-surface-card px-6 py-16 text-center dark:border-white/[0.12]">
          <Users className="size-10 text-muted-foreground" />
          <p className="mt-4 text-[15px] font-medium text-foreground">
            No staff yet
          </p>
          <p className="text-[13px] text-muted-foreground">
            Add your team members to manage roles and access.
          </p>

          <Link
            href="/dashboard/staff/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            <Plus className="size-4" />
            Add Staff
          </Link>
        </div>
      ) : (
        <>
          {/* FILTERS */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search staff…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 pl-10 pr-3 text-[14px] outline-none ring-[#006c49]/20 placeholder:text-muted-foreground focus:border-[#006c49]/40 focus:ring-2 dark:border-white/[0.12] dark:bg-[#141414]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
            >
              <option value="all">All roles</option>
              {Array.isArray(staff) && Array.from(new Set(staff.map((s) => s.roleName))).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
            >
              <option value="all">All branches</option>
              {Array.isArray(branches) && branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[1.25rem] border border-[#eef0f2] bg-surface-card px-6 py-14 text-center dark:border-white/[0.08]">
              <p className="text-[15px] font-medium text-foreground">
                No staff match these filters
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setRoleFilter("all");
                  setBranchFilter("all");
                }}
                className="mt-3 text-[13px] font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((staff) => (
                <div
                  key={staff.id}
                  className="group relative rounded-2xl border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:border-[#006c49]/20 hover:shadow-md dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/20"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[#006c49]/10 text-lg font-bold text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                      {(staff.name || "?").charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">
                        {staff.name}
                      </p>
                      <p className="truncate text-[12px] text-muted-foreground">
                        {staff.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex rounded-full bg-[#e5e7eb]/80 px-2.5 py-1 text-[11px] font-medium text-foreground dark:bg-white/[0.08]">
                      {staff.roleName}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${staff.status === "active"
                      ? "bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
                      : "bg-muted text-muted-foreground"
                      }`}>
                      {staff.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/dashboard/staff/${staff.id}/edit`}
                      className="flex-1 rounded-xl border border-[#e5e7eb] bg-white py-2 text-center text-[13px] font-medium hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(staff.id)}
                      className="flex size-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ProductsPageShell>
  );
}