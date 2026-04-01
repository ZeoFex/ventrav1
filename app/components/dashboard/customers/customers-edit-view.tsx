"use client";

import Link from "next/link";
import {
  CustomerForm,
  type CustomerFormInitialValues,
} from "../customers/customers-form";
import useSWR from "swr";
import { Loader2 } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch data");
  }
  return res.json();
};

export function CustomersEditView({ customerId }: { customerId: string }) {
  const { data: customer, isLoading, error } = useSWR(`/api/customers/${customerId}`, fetcher);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-[#006c49] dark:text-[#6ffbbe]" />
        <p className="mt-4 text-[14px] text-muted-foreground">Loading customer details...</p>
      </div>
    );
  }

  if (!customer || error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
          Customer not found
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          This customer may have been removed or the link is incorrect.
        </p>
        <Link
          href="/dashboard/customers"
          className="mt-6 inline-flex rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)]"
        >
          Back to customers
        </Link>
      </main>
    );
  }

  const initial: CustomerFormInitialValues = {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? "",
    status: customer.status,
  };

  return (
    <CustomerForm
      key={customerId}
      mode="edit"
      initial={initial}
      title="Edit customer"
      shellDescription="Update customer details and save changes."
    />
  );
}