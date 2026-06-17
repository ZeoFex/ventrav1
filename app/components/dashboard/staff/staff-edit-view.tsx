"use client";

import Link from "next/link";
import { StaffForm, type StaffFormInitialValues } from "./staff-form";
import useSWR from "swr";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StaffEditView({ staffId }: { staffId: string }) {
  const { data: staff, error, isLoading } = useSWR(`/api/staff/${staffId}`, fetcher);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !staff || staff.error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Staff not found
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          This staff member may have been removed or the link is incorrect.
        </p>

        <Link
          href="/dashboard/staff"
          className="mt-6 inline-flex rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)]"
        >
          Back to staff
        </Link>
      </main>
    );
  }

  const initial: StaffFormInitialValues = {
    firstName: staff.firstName,
    lastName: staff.lastName ?? "",
    phone: staff.phone,
    role: staff.roleName,
    branchId: staff.branchId,
    status: staff.status,
    imageSrc: staff.imageSrc ?? null,
  };

  return (
    <StaffForm
      key={staffId}
      mode="edit"
      initial={initial}
      staffId={staffId}
      title="Edit staff"
      shellDescription="Update staff details, credentials, and roles."
    />
  );
}