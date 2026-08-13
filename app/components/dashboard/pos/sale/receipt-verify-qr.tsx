"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { PosReceiptData } from "./pos-receipt-data";
import { buildReceiptVerificationUrl } from "./pos-receipt-data";

export function ReceiptVerificationBlock({ data }: { data: PosReceiptData }) {
    const [src, setSrc] = useState<string | null>(null);
    const saleId = data.saleId?.trim();

    useEffect(() => {
        if (!saleId) {
            setSrc(null);
            return;
        }
        const url = buildReceiptVerificationUrl(saleId);
        let cancelled = false;
        QRCode.toDataURL(url, {
            width: 112,
            margin: 1,
            errorCorrectionLevel: "M",
            color: { dark: "#0a0a0a", light: "#ffffff" },
        })
            .then((dataUrl) => {
                if (!cancelled) setSrc(dataUrl);
            })
            .catch(() => {
                if (!cancelled) setSrc(null);
            });
        return () => {
            cancelled = true;
        };
    }, [saleId]);

    if (!saleId) return null;

    return (
        <div className="mt-5 flex w-full flex-col items-center justify-center">
            {src ? (
                <img
                    src={src}
                    alt="Receipt verification QR"
                    width={112}
                    height={112}
                    className="block border border-black bg-white p-1"
                />
            ) : (
                <div
                    className="size-28 animate-pulse border border-black/20 bg-black/[0.06]"
                    aria-hidden
                />
            )}
        </div>
    );
}
