"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { toast } from "sonner";

export function SupplierFormView({ mode, supplierId }: { mode: "new" | "edit"; supplierId?: string }) {
    const router = useRouter();
    const [type, setType] = useState<"individual" | "business">("business");
    const [name, setName] = useState("");
    const [truck, setTruck] = useState("");
    const [email, setEmail] = useState("");
    const [phones, setPhones] = useState("");
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(mode === "new");

    useEffect(() => {
        if (mode !== "edit" || !supplierId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/suppliers/${supplierId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                if (cancelled) return;
                const s = data.supplier;
                setType(s.type);
                setName(s.name);
                setTruck(s.truckNumber || "");
                setEmail(s.email || "");
                setPhones((s.phones || []).map((p: { phone: string }) => p.phone).join("\n"));
                setLoaded(true);
            } catch {
                if (!cancelled) {
                    toast.error("Could not load supplier");
                    router.push("/dashboard/suppliers");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [mode, supplierId, router]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Name is required");
            return;
        }
        setSaving(true);
        try {
            const phoneList = phones
                .split(/[\n,]+/)
                .map((p) => p.trim())
                .filter(Boolean);
            const body = {
                type,
                name: name.trim(),
                truckNumber: truck.trim() || null,
                email: email.trim() || null,
                phones: phoneList,
            };
            const url = mode === "new" ? "/api/suppliers" : `/api/suppliers/${supplierId}`;
            const method = mode === "new" ? "POST" : "PATCH";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || "Save failed");
            }
            toast.success(mode === "new" ? "Supplier created" : "Supplier updated");
            router.push("/dashboard/suppliers");
            router.refresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSaving(false);
        }
    }

    if (mode === "edit" && !loaded) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <ProductsPageShell
            title={mode === "new" ? "Add supplier" : "Edit supplier"}
            description="Record contact details for individuals or businesses you buy stock from."
            actions={
                <Link
                    href="/dashboard/suppliers"
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[14px]"
                >
                    <ArrowLeft className="size-4" />
                    Back
                </Link>
            }
        >
            <form
                onSubmit={handleSubmit}
                className="mx-auto max-w-xl space-y-4 rounded-2xl border border-[#eef0f2] p-6 dark:border-white/[0.08]"
            >
                <div>
                    <label className="mb-1 block text-[13px] font-medium">Type</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as "individual" | "business")}
                        className="w-full rounded-xl border px-3 py-2.5 dark:border-white/[0.12] dark:bg-[#111]"
                    >
                        <option value="business">Business</option>
                        <option value="individual">Individual</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-[13px] font-medium">Name</label>
                    <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 dark:border-white/[0.12] dark:bg-[#111]"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-[13px] font-medium">Truck number (optional)</label>
                    <input
                        value={truck}
                        onChange={(e) => setTruck(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 dark:border-white/[0.12] dark:bg-[#111]"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-[13px] font-medium">Email (optional)</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 dark:border-white/[0.12] dark:bg-[#111]"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-[13px] font-medium">Phone numbers</label>
                    <textarea
                        value={phones}
                        onChange={(e) => setPhones(e.target.value)}
                        placeholder="One per line or comma-separated"
                        rows={3}
                        className="w-full rounded-xl border px-3 py-2.5 dark:border-white/[0.12] dark:bg-[#111]"
                    />
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-xl bg-[#006c49] py-3 font-semibold text-white disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#003523]"
                >
                    {saving ? <Loader2 className="mx-auto size-5 animate-spin" /> : "Save"}
                </button>
            </form>
        </ProductsPageShell>
    );
}
