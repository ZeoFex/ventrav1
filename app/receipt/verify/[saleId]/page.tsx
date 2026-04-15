import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicReceiptVerification } from "@/server/receipt/public-receipt-verify";

function formatMoney(n: number, sym = "GHS") {
    return `${sym} ${n.toFixed(2)}`;
}

export default async function ReceiptVerifyPage({
    params,
}: {
    params: Promise<{ saleId: string }>;
}) {
    const { saleId } = await params;
    const data = await getPublicReceiptVerification(saleId);
    if (!data) notFound();

    const isCompleted = data.status === "completed";

    return (
        <div className="min-h-screen bg-[#f4f4f5] px-4 py-10 text-[#18181b]">
            <div className="mx-auto max-w-lg">
                <div className="mb-6 text-center">
                    <div
                        className={`mx-auto mb-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
                            isCompleted
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-amber-100 text-amber-950"
                        }`}
                    >
                        {isCompleted ? "Verified sale" : `Status: ${data.status}`}
                    </div>
                    <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                        {data.storeName}
                    </h1>
                    {data.branchName ? (
                        <p className="mt-1 text-[15px] font-medium text-[#52525b]">{data.branchName}</p>
                    ) : null}
                    {data.branchLocation ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#71717a]">
                            {data.branchLocation}
                        </p>
                    ) : null}
                </div>

                <div className="rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-sm">
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="text-[#71717a]">Invoice</dt>
                            <dd className="font-mono font-semibold">{data.invoiceId}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-[#71717a]">Date</dt>
                            <dd className="text-right">
                                {new Date(data.createdAt).toLocaleString("en-GH", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                })}
                            </dd>
                        </div>
                        {data.customerName ? (
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#71717a]">Customer</dt>
                                <dd className="font-medium">{data.customerName}</dd>
                            </div>
                        ) : null}
                        <div className="flex justify-between gap-4">
                            <dt className="text-[#71717a]">Payment</dt>
                            <dd className="font-medium">{data.paymentMethodLabel}</dd>
                        </div>
                        {data.operatorName ? (
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#71717a]">Operator</dt>
                                <dd className="font-medium">{data.operatorName}</dd>
                            </div>
                        ) : null}
                    </dl>

                    <div className="my-5 border-t border-dashed border-[#d4d4d8]" />

                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                        Items ({data.itemCount})
                    </p>
                    <ul className="space-y-2.5">
                        {data.lines.map((line, i) => (
                            <li key={i} className="flex justify-between gap-3 text-sm">
                                <span className="min-w-0 flex-1">
                                    <span className="font-medium text-[#18181b]">{line.productName}</span>
                                    <span className="text-[#71717a]"> ×{line.quantity}</span>
                                </span>
                                <span className="shrink-0 font-semibold tabular-nums">
                                    {formatMoney(line.lineTotalGhs)}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-5 space-y-1.5 border-t border-[#e4e4e7] pt-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#71717a]">Subtotal</span>
                            <span className="tabular-nums">{formatMoney(data.subtotalGhs)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#71717a]">Tax</span>
                            <span className="tabular-nums">{formatMoney(data.taxGhs)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#71717a]">Discount</span>
                            <span className="tabular-nums">−{formatMoney(data.discountGhs)}</span>
                        </div>
                        <div className="flex justify-between pt-2 text-base font-bold">
                            <span>Total</span>
                            <span className="tabular-nums">{formatMoney(data.totalGhs)}</span>
                        </div>
                    </div>
                </div>

                <p className="mt-6 text-center text-sm leading-relaxed text-[#71717a]">
                    This page confirms the sale exists in VentraPOS for the store shown above. If amounts or items
                    do not match a paper receipt, contact the merchant.
                </p>

                <p className="mt-4 text-center">
                    <Link href="/" className="text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">
                        Back to home
                    </Link>
                </p>
            </div>
        </div>
    );
}
