"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, FileType, Check, AlertCircle, Loader2, Table } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type ImportProductsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[]) => void;
};

type Step = "upload" | "mapping" | "preview";

export function ImportProductsModal({ isOpen, onClose, onImport }: ImportProductsModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = useCallback(() => {
        setStep("upload");
        setFile(null);
        setParsedData([]);
        setHeaders([]);
        setMapping({});
        setError(null);
        setIsParsing(false);
    }, []);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const processFile = async (selectedFile: File) => {
        setIsParsing(true);
        setError(null);
        setFile(selectedFile);

        const extension = selectedFile.name.split(".").pop()?.toLowerCase();

        try {
            if (extension === "csv") {
                Papa.parse(selectedFile, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.data && results.data.length > 0) {
                            setParsedData(results.data);
                            setHeaders(Object.keys(results.data[0] as object));
                            autoMapHeaders(Object.keys(results.data[0] as object));
                            setStep("mapping");
                        } else {
                            setError("The CSV file seems to be empty or invalid.");
                        }
                        setIsParsing(false);
                    },
                    error: (err) => {
                        setError(`Error parsing CSV: ${err.message}`);
                        setIsParsing(false);
                    },
                });
            } else if (extension === "xlsx" || extension === "xls") {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = e.target?.result;
                        const workbook = XLSX.read(data, { type: "binary" });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        const json = XLSX.utils.sheet_to_json(worksheet);

                        if (json && json.length > 0) {
                            setParsedData(json);
                            setHeaders(Object.keys(json[0] as object));
                            autoMapHeaders(Object.keys(json[0] as object));
                            setStep("mapping");
                        } else {
                            setError("The Excel file seems to be empty or invalid.");
                        }
                    } catch (err) {
                        setError("Failed to parse Excel file.");
                    }
                    setIsParsing(false);
                };
                reader.readAsBinaryString(selectedFile);
            } else {
                setError("Unsupported file format. Please upload a CSV or Excel file.");
                setIsParsing(false);
            }
        } catch (err) {
            setError("An unexpected error occurred while processing the file.");
            setIsParsing(false);
        }
    };

    const productFields = [
        { key: "name", label: "Product Name", required: true },
        { key: "sku", label: "SKU", required: true },
        { key: "priceGhs", label: "Price (GHS)", required: true },
        { key: "stock", label: "Stock Level", required: false },
        { key: "reorderAt", label: "Reorder Alert Level", required: false },
        { key: "categoryId", label: "Category ID", required: false },
        { key: "description", label: "Description", required: false },
    ];

    const autoMapHeaders = (fileHeaders: string[]) => {
        const newMapping: Record<string, string> = {};
        productFields.forEach((field) => {
            const match = fileHeaders.find(
                (h) =>
                    h.toLowerCase().includes(field.key.toLowerCase()) ||
                    h.toLowerCase().includes(field.label.toLowerCase())
            );
            if (match) {
                newMapping[field.key] = match;
            }
        });
        setMapping(newMapping);
    };

    const handleMappingChange = (fieldKey: string, headerName: string) => {
        setMapping((prev) => ({ ...prev, [fieldKey]: headerName }));
    };

    const handleImport = () => {
        const mappedData = parsedData.map((row) => {
            const item: any = {};
            productFields.forEach((field) => {
                const fileHeader = mapping[field.key];
                if (fileHeader) {
                    let value = row[fileHeader];
                    if (field.key === "priceGhs" || field.key === "stock") {
                        value = parseFloat(value) || 0;
                    }
                    item[field.key] = value;
                }
            });
            return item;
        });

        onImport(mappedData);
        onClose();
        reset();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-200 rounded-[1.5rem] border border-[#eef0f2] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#f0f2f4] dark:border-white/[0.06] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
                            Import Products
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {step === "upload" && "Upload a CSV or Excel file to import products."}
                            {step === "mapping" && "Map your file columns to product fields."}
                            {step === "preview" && "Review the data before final import."}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            onClose();
                            reset();
                        }}
                        className="rounded-full p-2 hover:bg-[#f4f5f7] dark:hover:bg-white/5 transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <p className="text-[13px] leading-relaxed">{error}</p>
                        </div>
                    )}

                    {step === "upload" && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const droppedFile = e.dataTransfer.files[0];
                                if (droppedFile) processFile(droppedFile);
                            }}
                            className="group relative flex flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed border-[#e5e7eb] bg-[#fafafa] py-12 px-6 text-center transition-all hover:border-[#006c49]/40 hover:bg-[#006c49]/5 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-[#6ffbbe]/40 dark:hover:bg-[#6ffbbe]/5"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e7eb] group-hover:scale-110 transition-transform dark:bg-[#1a1a1a] dark:ring-white/[0.08]">
                                {isParsing ? (
                                    <Loader2 className="size-6 animate-spin text-[#006c49] dark:text-[#6ffbbe]" />
                                ) : (
                                    <Upload className="size-6 text-muted-foreground" strokeWidth={1.5} />
                                )}
                            </div>
                            <p className="text-[15px] font-semibold text-foreground">
                                {isParsing ? "Reading file..." : "Click or drag file to upload"}
                            </p>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                Support .csv, .xlsx, .xls (max 10MB)
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-3">
                                <div className="flex items-center gap-1.5 rounded-lg bg-[#f0f2f4] px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/5">
                                    <FileType className="size-3" />
                                    CSV
                                </div>
                                <div className="flex items-center gap-1.5 rounded-lg bg-[#f0f2f4] px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:bg-white/5">
                                    <Table className="size-3" />
                                    Excel
                                </div>
                            </div>
                        </div>
                    )}

                    {step === "mapping" && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                                <p className="text-[13px] font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                    <Check className="size-4 text-[#006c49] dark:text-[#6ffbbe]" />
                                    Successfully loaded <strong>{parsedData.length}</strong> rows from <strong>{file?.name}</strong>
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {productFields.map((field) => (
                                        <div key={field.key} className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            <select
                                                value={mapping[field.key] || ""}
                                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
                                            >
                                                <option value="">-- Don't Map --</option>
                                                {headers.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep("preview")}
                                disabled={!mapping.name || !mapping.sku || !mapping.priceGhs}
                                className="w-full rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3 text-[14px] font-semibold text-white shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
                            >
                                Preview Data
                            </button>
                        </div>
                    )}

                    {step === "preview" && (
                        <div className="space-y-4">
                            <div className="overflow-hidden rounded-xl border border-[#eef0f2] dark:border-white/[0.08]">
                                <div className="max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-left text-[12px]">
                                        <thead className="sticky top-0 bg-[#fafafa] dark:bg-[#1a1a1a] border-b border-[#f0f2f4] dark:border-white/[0.06]">
                                            <tr>
                                                {productFields.map(field => mapping[field.key] && (
                                                    <th key={field.key} className="px-3 py-2 font-semibold text-muted-foreground">
                                                        {field.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.06]">
                                            {parsedData.slice(0, 5).map((row, i) => (
                                                <tr key={i} className="bg-white dark:bg-transparent">
                                                    {productFields.map(field => mapping[field.key] && (
                                                        <td key={field.key} className="px-3 py-2 text-foreground truncate max-w-[150px]">
                                                            {row[mapping[field.key]]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {parsedData.length > 5 && (
                                                <tr className="bg-[#fafafa] dark:bg-white/[0.02]">
                                                    <td colSpan={productFields.filter(f => mapping[f.key]).length} className="px-3 py-2 text-center text-muted-foreground italic">
                                                        + {parsedData.length - 5} more rows...
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep("mapping")}
                                    className="flex-1 rounded-xl border border-[#e5e7eb] py-3 text-[14px] font-medium transition-colors hover:bg-[#f4f5f7] dark:border-white/[0.12] dark:hover:bg-white/5"
                                >
                                    Back to Mapping
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="flex-[2] rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3 text-[14px] font-semibold text-white shadow-lg hover:brightness-110"
                                >
                                    Complete Import
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
