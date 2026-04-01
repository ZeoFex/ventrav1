"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { type CustomerStatus } from "./customers-mock-data";
import { useSWRConfig } from "swr";

export type CustomerFormInitialValues = {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  status: CustomerStatus;
};

type CustomerFormProps = {
  mode: "new" | "edit";
  initial: CustomerFormInitialValues;
  title: string;
  shellDescription: string;
  onSuccess?: (customer: any) => void;
  isModal?: boolean;
};

export function CustomerForm({
  mode,
  initial,
  title,
  shellDescription,
  onSuccess,
  isModal = false,
}: CustomerFormProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email ?? "");
  const [status, setStatus] = useState<CustomerStatus>(initial.status);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = mode === "new" ? "/api/customers" : `/api/customers/${initial.id}`;
      const method = mode === "new" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save customer");
      }

      await mutate("/api/customers");
      if (onSuccess) {
        onSuccess(await res.json());
      } else {
        router.push("/dashboard/customers");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const formView = (
    <div className={isModal ? "" : "max-w-4xl"}>
      {error && (
        <div className="mb-6 rounded-xl border border-red-600/25 bg-red-600/5 px-4 py-3 text-[13px] text-red-600 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-400">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#111]"
      >
        {/* BASIC INFO */}
        <section className="space-y-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Customer details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-foreground">
                Name <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kwame Mensah"
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
              />
            </label>

            {/* Phone */}
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-foreground">
                Phone <span className="text-red-600">*</span>
              </span>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0241234567"
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
              />
            </label>
          </div>

          {/* Email */}
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium text-foreground">
              Email (optional)
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. example@email.com"
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
            />
          </label>
        </section>

        {/* STATUS */}
        <section className="space-y-4 border-t border-[#f0f2f4] pt-8 dark:border-white/[0.06]">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </h2>

          <label className="block space-y-1.5 max-w-sm">
            <span className="text-[13px] font-medium text-foreground">
              Customer status
            </span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as CustomerStatus)
              }
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse gap-3 border-t border-[#f0f2f4] pt-6 sm:flex-row sm:justify-end dark:border-white/[0.06]">
          {!isModal && (
            <Link
              href="/dashboard/customers"
              className="inline-flex justify-center rounded-xl border border-[#e5e7eb] bg-white px-5 py-2.5 text-[14px] font-medium text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
            >
              Cancel
            </Link>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] hover:brightness-105 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {mode === "new" ? "Save customer" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );

  if (isModal) return formView;

  return (
    <ProductsPageShell
      title={title}
      description={shellDescription}
      actions={
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Back to list
        </Link>
      }
    >
      {formView}
    </ProductsPageShell>
  );
}