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
            width: 168,
            margin: 2,
            errorCorrectionLevel: "H",
            color: { dark: "#000000", light: "#ffffff" },
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
                    width={168}
                    height={168}
                    className="block border-2 border-black bg-white p-1.5"
                />
            ) : (
                <div
                    className="size-[10.5rem] animate-pulse border-2 border-black/20 bg-black/[0.06]"
                    aria-hidden
                />
            )}
        </div>
    );
}
