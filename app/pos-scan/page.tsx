"use client";

import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { PosBarcodeCamera } from "@/app/components/dashboard/pos/sale/pos-barcode-camera";
import { playPosAddProductBeep } from "@/app/components/dashboard/pos/sale/pos-add-beep";

function RemoteScanContent() {
    const searchParams = useSearchParams();
    const titleId = useId();
    const sessionId = searchParams.get("s");
    const token = searchParams.get("t");

    const [status, setStatus] = useState<
        "idle" | "sending" | "ok" | "err"
    >("idle");
    const [flash, setFlash] = useState(false);
    const [lastMsg, setLastMsg] = useState<string | null>(null);
    const lastSendRef = useRef<{ text: string; at: number } | null>(null);

    const sendBarcode = useCallback(
        async (barcode: string) => {
            if (!sessionId || !token) return;
            const now = Date.now();
            const prev = lastSendRef.current;
            if (prev && prev.text === barcode && now - prev.at < 800) return;
            lastSendRef.current = { text: barcode, at: now };

            setStatus("sending");
            setLastMsg(null);

            // Audio-visual feedback
            playPosAddProductBeep();
            setFlash(true);
            setTimeout(() => setFlash(false), 500);

            try {
                const res = await fetch(
                    `/api/pos/relay/${encodeURIComponent(sessionId)}/scan`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, barcode }),
                    },
                );
                if (!res.ok) {
                    setStatus("err");
                    setLastMsg("Session expired or invalid. Scan the QR again from POS.");
                    return;
                }
                setStatus("ok");
                setLastMsg("Sent to register");
                window.setTimeout(() => setStatus("idle"), 1200);
            } catch {
                setStatus("err");
                setLastMsg("Network error. Try again.");
            }
        },
        [sessionId, token],
    );

    if (!sessionId || !token) {
        return (
            <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center">
                <p className="text-[15px] font-medium text-white">
                    Missing pairing link
                </p>
                <p className="text-[13px] text-white/65">
                    Open VentraPOS on desktop, tap Scan, and scan the QR from this phone.
                </p>
                <Link
                    href="/dashboard/pos/sale"
                    className="rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-medium text-white dark:bg-[#6ffbbe] dark:text-[#0a0a0a]"
                >
                    Go to POS
                </Link>
            </div>
        );
    }

    return (
        <div className="flex min-h-[100dvh] flex-col bg-black">
            <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <div className="min-w-0">
                    <h1
                        id={titleId}
                        className="font-[family-name:var(--font-display)] text-base font-semibold text-white"
                    >
                        Remote scanner
                    </h1>
                    <p className="text-[12px] text-white/65">
                        Scans add to your desktop sale
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => window.close()}
                    className="tap-target flex size-11 items-center justify-center rounded-xl text-white/90 hover:bg-white/10"
                    aria-label="Close"
                >
                    <X className="size-5" strokeWidth={2} />
                </button>
            </header>

            <div className="relative min-h-0 flex-1">
                <PosBarcodeCamera active onScan={sendBarcode} className="h-full min-h-[70dvh] w-full" />

                {/* Green guard flash overlay */}
                <div
                    className={`pointer-events-none absolute inset-0 z-50 border-[6px] transition-colors duration-200 ${flash ? "border-[#6ffbbe] bg-[#6ffbbe]/10" : "border-transparent bg-transparent"
                        }`}
                    aria-hidden
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
                        {status === "sending" || flash ? (
                            <p className="flex items-center gap-2 text-[13px] font-medium text-[#6ffbbe]">
                                <Check className="size-4" aria-hidden />
                                {flash ? "Captured!" : "Sending…"}
                            </p>
                        ) : status === "ok" ? (
                            <p className="flex items-center gap-2 text-[13px] font-medium text-[#6ffbbe]">
                                <Check className="size-4" aria-hidden />
                                {lastMsg}
                            </p>
                        ) : status === "err" ? (
                            <p className="text-[13px] text-red-300">{lastMsg}</p>
                        ) : (
                            <p className="text-[13px] text-white/85">
                                Point at a barcode — scans go to your desktop register
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RemoteScanSkeleton() {
    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white/50">
            <Loader2 className="size-8 animate-spin" aria-hidden />
        </div>
    );
}

export default function PosRemoteScanPage() {
    return (
        <Suspense fallback={<RemoteScanSkeleton />}>
            <RemoteScanContent />
        </Suspense>
    );
}
