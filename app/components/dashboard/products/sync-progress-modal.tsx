"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, X, DownloadCloud } from "lucide-react";

type SyncType = "products" | "categories";

interface SyncProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    type: SyncType;
}

export function SyncProgressModal({ isOpen, onClose, onComplete, type }: SyncProgressModalProps) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("Initializing sync...");
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [resultMsg, setResultMsg] = useState("");

    const hasStarted = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            hasStarted.current = false;
            setProgress(0);
            setStatus("Initializing sync...");
            setError(null);
            setIsFinished(false);
            setResultMsg("");
            return;
        }

        if (hasStarted.current) return;
        hasStarted.current = true;

        let isCanceled = false;

        const runSyncFlow = async () => {
            try {
                // Step 1: Connecting (Simulated)
                setStatus("Connecting to Main Branch...");
                setProgress(15);
                await new Promise(r => setTimeout(r, 600));

                if (isCanceled) return;

                // Step 2: Analyzing differences (Simulated)
                setStatus(`Analyzing ${type === "products" ? "catalog" : "category"} differences...`);
                setProgress(40);
                await new Promise(r => setTimeout(r, 800));

                if (isCanceled) return;

                // Step 3: Call Actual API
                setStatus(`Importing missing ${type}...`);
                // Start a slow progressive creep while waiting for network
                const creepInterval = setInterval(() => {
                    setProgress(p => (p < 85 ? p + 2 : p));
                }, 200);

                const endpoint = type === "categories"
                    ? "/api/products/categories/sync-main"
                    : "/api/products/sync-main";

                const res = await fetch(endpoint, { method: "POST" });
                const data = await res.json();

                clearInterval(creepInterval);
                if (isCanceled) return;

                if (!res.ok) {
                    throw new Error(data.error || "Failed to synchronize.");
                }

                // Step 4: Finalizing
                setProgress(95);
                setStatus("Finalizing local caches...");
                await new Promise(r => setTimeout(r, 500));

                if (isCanceled) return;

                // Done
                setProgress(100);
                setIsFinished(true);
                setResultMsg(data.message || `Successfully synced ${type}!`);
                onComplete();

                // Auto-close after a moment
                setTimeout(() => {
                    if (!isCanceled) onClose();
                }, 2000);

            } catch (err: any) {
                if (isCanceled) return;
                setError(err.message || "An unexpected error occurred.");
                setProgress(0);
            }
        };

        runSyncFlow();

        return () => {
            isCanceled = true;
        };
    }, [isOpen, type, onClose, onComplete]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md animate-in fade-in zoom-in duration-200 rounded-3xl border border-[#eef0f2] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-[#f4f5f7] dark:hover:bg-white/5 transition-colors z-10"
                >
                    <X className="size-5" />
                </button>

                <div className="p-8 text-center flex flex-col items-center">
                    {error ? (
                        <>
                            <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                <AlertCircle className="size-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Sync Failed</h3>
                            <p className="text-muted-foreground text-[14px] mb-8 px-4">{error}</p>
                            <button onClick={onClose} className="w-full bg-[#f0f2f4] dark:bg-white/5 py-3 rounded-xl font-semibold hover:bg-[#e5e7eb] dark:hover:bg-white/10 transition-colors">
                                Close
                            </button>
                        </>
                    ) : isFinished ? (
                        <>
                            <div className="size-16 rounded-full bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe] flex items-center justify-center mb-6 animate-out fade-out zoom-out duration-300 fill-mode-backwards">
                                <CheckCircle2 className="size-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Sync Complete</h3>
                            <p className="text-muted-foreground text-[14px] mb-8">{resultMsg}</p>
                        </>
                    ) : (
                        <>
                            <div className="relative mb-8 mt-2">
                                <div className="absolute inset-0 bg-[#006c49]/5 dark:bg-[#6ffbbe]/5 rounded-full blur-xl scale-150 animate-pulse" />
                                <div className="relative size-16 rounded-full bg-[#006c49]/10 text-[#006c49] dark:bg-white/5 dark:text-white flex items-center justify-center ring-4 ring-white dark:ring-[#111] shadow-sm">
                                    <DownloadCloud className="size-7 animate-bounce" />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold tracking-tight mb-2">Syncing {type === "products" ? "Catalog" : "Categories"}</h3>
                            <p className="text-muted-foreground text-[14px] mb-8 font-medium animate-pulse">{status}</p>

                            <div className="w-full space-y-3 px-2">
                                <div className="h-2.5 w-full bg-[#f0f2f4] dark:bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#003527] to-[#006c49] dark:from-[#006c49] dark:to-[#6ffbbe] rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[12px] font-bold text-muted-foreground px-1">
                                    <span>Main Branch</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="mt-8 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel Sync
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
