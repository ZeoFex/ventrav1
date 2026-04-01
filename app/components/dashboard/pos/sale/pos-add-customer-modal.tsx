"use client";

import { X } from "lucide-react";
import { CustomerForm } from "../../customers/customers-form";

type PosAddCustomerModalProps = {
    onClose: () => void;
    onSuccess: (customer: any) => void;
};

export function PosAddCustomerModal({ onClose, onSuccess }: PosAddCustomerModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-[#111]">
                <div className="flex items-center justify-between border-b border-[#f0f2f4] px-6 py-4 dark:border-white/[0.06]">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
                        Quick Add Customer
                    </h3>
                    <button
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-elevated dark:hover:bg-[#1a1a1a]"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="max-h-[min(80vh,600px)] overflow-y-auto px-6 py-6 custom-scrollbar">
                    <CustomerForm
                        mode="new"
                        isModal={true}
                        initial={{ name: "", phone: "", email: "", status: "active" }}
                        onSuccess={(customer) => {
                            onSuccess(customer);
                            onClose();
                        }}
                        title="Quick Add"
                        shellDescription="Enter details to associate this sale with a new customer."
                    />
                </div>
            </div>
        </div>
    );
}
