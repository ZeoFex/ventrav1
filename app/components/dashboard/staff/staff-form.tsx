"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ImageIcon, X, Loader2, Eye, EyeOff } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { AddRoleModal } from "./staff-role-modal";
import useSWR, { mutate as globalMutate } from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PasswordRequirements } from "@/app/components/auth/password-requirements";
import { isPasswordValid } from "@/lib/password-requirements";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type StaffFormInitialValues = {
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  branchId: string;
  status: "active" | "inactive";
  imageSrc: string | null;
};

type StaffFormProps = {
  mode: "new" | "edit";
  initial: StaffFormInitialValues;
  title: string;
  shellDescription: string;
  staffId?: string;
};

export function StaffForm({
  mode,
  initial,
  title,
  shellDescription,
  staffId,
}: StaffFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [phone, setPhone] = useState(initial.phone);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleName, setRoleName] = useState(initial.role);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [branchId, setBranchId] = useState(initial.branchId);
  const [status, setStatus] = useState(initial.status);

  const passwordRequired = mode === "new";
  const passwordProvided = password.length > 0;
  const passwordMeetsRequirements = useMemo(
    () => isPasswordValid(password),
    [password]
  );
  const passwordFieldInvalid =
    (passwordRequired && !passwordMeetsRequirements) ||
    (!passwordRequired && passwordProvided && !passwordMeetsRequirements);

  // Dynamic Data
  const { data: branches, isLoading: branchesLoading } = useSWR<any[]>("/api/branches", fetcher);
  const { data: roles, mutate: mutateRoles } = useSWR<any[]>("/api/staff/roles", fetcher);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [rolePermissionsForEdit, setRolePermissionsForEdit] = useState<string[]>([]);
  const lastRoleRef = useRef<string>(initial.role);

  const blobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initial.imageSrc
  );

  const revokeBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => revokeBlob();
  }, [revokeBlob]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    revokeBlob();

    if (!file || !file.type.startsWith("image/")) {
      setImagePreview(initial.imageSrc ?? null);
      return;
    }

    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setImagePreview(url);
  }

  function clearImage() {
    revokeBlob();
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordFieldInvalid) {
      setError("Password does not meet all requirements.");
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const url = mode === "new" ? "/api/staff" : `/api/staff/${staffId}`;
      const method = mode === "new" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          password: password || undefined,
          roleName,
          branchId,
          permissionKeys: mode === "new" ? permissionKeys : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save staff");
      }

      // Invalidate the SWR cache so the staff list re-fetches immediately
      await globalMutate("/api/staff");

      const staffName = [firstName, lastName].filter(Boolean).join(" ");
      if (mode === "new") {
        toast.success("Staff account created", {
          description: `${staffName} has been added to your team.`,
        });
      } else {
        toast.success("Changes saved", {
          description: `${staffName}'s account has been updated.`,
        });
      }

      router.push("/dashboard/staff");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to save staff", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  const handleRoleChange = (val: string) => {
    if (val === "ADD_NEW_ROLE") {
      lastRoleRef.current = roleName;
      setIsRoleModalOpen(true);
    } else {
      setRoleName(val);
      // If selecting existing role, we might want to fetch permissions for it
      // but for now the user wants to add them during creation.
    }
  };

  const handleAddNewRole = (name: string, perms: string[]) => {
    mutateRoles(); // Refresh the list from the newly created role
    setRoleName(name);
    setPermissionKeys(perms);
    setIsRoleModalOpen(false);
  };

  const handleEditRole = async () => {
    const role = roles?.find(r => r.name === roleName);
    if (!role) return;

    try {
      const res = await fetch(`/api/staff/roles/${role.id}`);
      const data = await res.json();
      if (data.permissionKeys) {
        setRolePermissionsForEdit(data.permissionKeys);
        setIsRoleModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch role permissions:", err);
    }
  };

  const handleCloseModal = () => {
    setIsRoleModalOpen(false);
    setRolePermissionsForEdit([]);
    // Only reset if we were adding a brand new role and closed without saving
    if (roleName === "ADD_NEW_ROLE") {
      setRoleName(lastRoleRef.current);
    }
  };

  return (
    <>
      <ProductsPageShell
        title={title}
        description={shellDescription}
        actions={
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-[14px] font-medium text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
            Back to list
          </Link>
        }
      >
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#111]"
        >
          {/* ================= PHOTO ================= */}
          <section className="space-y-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Photo
            </h2>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative size-32 overflow-hidden rounded-2xl border border-[#eef0f2] bg-[#f4f5f7] dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt=""
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg bg-black/60 text-white"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex size-full flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-8 opacity-50" />
                    <span className="text-[11px]">No image</span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-[#006c49]/12 file:px-3 file:py-2 file:text-[#006c49] hover:file:bg-[#006c49]/18"
              />
            </div>
          </section>

          {/* ================= BASIC INFO ================= */}
          <section className="space-y-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Basic info
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
              />

              <input
                placeholder="Last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
              />
            </div>
          </section>

          {/* ================= LOGIN CREDENTIALS ================= */}
          <section className="space-y-4 border-t border-[#f0f2f4] pt-6 dark:border-white/[0.06]">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Login credentials
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Staff sign in with this phone number and password, then verify with an SMS code.
            </p>

            <input
              required
              type="tel"
              placeholder="Phone number (login ID)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
            />

            <div className="relative max-w-md">
              <input
                required={mode === "new"}
                type={showPassword ? "text" : "password"}
                placeholder={mode === "new" ? "Set password" : "Leave blank to keep current"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 pr-11 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-[#f4f5f7] hover:text-foreground dark:hover:bg-[#262626]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            <PasswordRequirements
              password={password}
              showWhenEmpty={mode === "new"}
            />
          </section>

          {/* ================= ROLE & BRANCH ================= */}
          <section className="space-y-4 border-t border-[#f0f2f4] pt-6 dark:border-white/[0.06]">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Role & Branch
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <select
                  value={roleName}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
                >
                  <option value="">Select a role</option>
                  {Array.isArray(roles) && roles.map((r: any) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                  <option value="ADD_NEW_ROLE" className="font-semibold text-[#006c49] dark:text-[#6ffbbe]">
                    + Add Custom Role...
                  </option>
                </select>
                {roleName && roleName !== "ADD_NEW_ROLE" && (
                  <button
                    type="button"
                    onClick={handleEditRole}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                  >
                    Edit
                  </button>
                )}
              </div>

              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
              >
                <option value="">Select branch</option>
                {Array.isArray(branches) && branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ================= STATUS ================= */}
          <section className="space-y-4 border-t border-[#f0f2f4] pt-6 dark:border-white/[0.06]">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </h2>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full max-w-sm rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </section>

          {/* ================= ACTIONS ================= */}
          <div className="flex flex-col-reverse gap-3 border-t border-[#f0f2f4] pt-6 sm:flex-row sm:justify-end dark:border-white/[0.06]">
            <Link
              href="/dashboard/staff"
              className="inline-flex justify-center rounded-xl border border-[#e5e7eb] bg-white px-5 py-2.5 text-[14px] font-medium text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving || passwordFieldInvalid}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] hover:brightness-105 disabled:opacity-70"
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {mode === "new" ? "Create staff account" : "Save changes"}
            </button>
          </div>
        </form>
      </ProductsPageShell>
      <AddRoleModal
        isOpen={isRoleModalOpen}
        onClose={handleCloseModal}
        onAdd={handleAddNewRole}
        initialRoleName={roleName === "ADD_NEW_ROLE" ? "" : roleName}
        initialPermissions={rolePermissionsForEdit}
      />
    </>
  );
}
