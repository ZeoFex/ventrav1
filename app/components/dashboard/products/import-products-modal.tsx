import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, FileType, Check, AlertCircle, Loader2, Table, CheckCircle2, DownloadCloud } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type ImportProductsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onImport: () => void;
};

type Step = "upload" | "mapping" | "preview" | "importing" | "success";

export function ImportProductsModal({ isOpen, onClose, onImport }: ImportProductsModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Progress states
    const [importProgress, setImportProgress] = useState(0);
    const [visualProgress, setVisualProgress] = useState(0);
    const [totalRows, setTotalRows] = useState(0);
    const [processedRows, setProcessedRows] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Smooth visual progress counter
    useEffect(() => {
        if (step === "importing") {
            const timer = setInterval(() => {
                setVisualProgress(prev => {
                    if (prev < importProgress) {
                        return Math.min(prev + 1, importProgress);
                    }
                    return prev;
                });
            }, 50);
            return () => clearInterval(timer);
        }
    }, [step, importProgress]);

    const reset = useCallback(() => {
        setStep("upload");
        setFile(null);
        setParsedData([]);
        setHeaders([]);
        setMapping({});
        setError(null);
        setIsParsing(false);
        setImportProgress(0);
        setVisualProgress(0);
        setProcessedRows(0);
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

    const handleImport = async () => {
        setStep("importing");
        setError(null);

        const mappedData = parsedData.map((row) => {
            const item: any = {};
            productFields.forEach((field) => {
                const fileHeader = mapping[field.key];
                if (fileHeader) {
                    item[field.key] = row[fileHeader];
                }
            });
            return item;
        });

        const total = mappedData.length;
        setTotalRows(total);
        const chunkSize = 500;
        let processed = 0;

        try {
            for (let i = 0; i < total; i += chunkSize) {
                const chunk = mappedData.slice(i, i + chunkSize);
                
                const res = await fetch("/api/products/bulk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items: chunk }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Bulk import failed at chunk " + (Math.floor(i / chunkSize) + 1));
                }

                processed += chunk.length;
                setProcessedRows(processed);
                setImportProgress(Math.min(Math.round((processed / total) * 100), 100));
            }

            setStep("success");
            onImport();
            
            setTimeout(() => {
                onClose();
                reset();
            }, 2500);

        } catch (err: any) {
            setError(err.message);
            setStep("mapping"); // Go back so they can fix mapping if needed
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-200 rounded-[2rem] border border-[#eef0f2] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111] overflow-hidden">
                <div className="px-8 py-6 border-b border-[#f0f2f4] dark:border-white/[0.06] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
                            Import Products
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {step === "upload" && "Upload a CSV or Excel file to import products."}
                            {step === "mapping" && "Map your file columns to product fields."}
                            {step === "preview" && "Review the data before final import."}
                            {step === "importing" && "Adding products to your catalog..."}
                            {step === "success" && "Products successfully imported."}
                        </p>
                    </div>
                    {step !== "importing" && (
                        <button
                            onClick={() => {
                                onClose();
                                reset();
                            }}
                            className="rounded-full p-2 hover:bg-[#f4f5f7] dark:hover:bg-white/5 transition-colors"
                        >
                            <X className="size-5" />
                        </button>
                    )}
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
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
                            className="group relative flex flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-[#e5e7eb] bg-[#fafafa] py-16 px-6 text-center transition-all hover:border-[#006c49]/40 hover:bg-[#006c49]/5 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-[#6ffbbe]/40 dark:hover:bg-[#6ffbbe]/5 cursor-pointer"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e7eb] group-hover:scale-110 transition-transform dark:bg-[#1a1a1a] dark:ring-white/[0.08]">
                                {isParsing ? (
                                    <Loader2 className="size-8 animate-spin text-[#006c49] dark:text-[#6ffbbe]" />
                                ) : (
                                    <Upload className="size-8 text-muted-foreground" strokeWidth={1.5} />
                                )}
                            </div>
                            <p className="text-[17px] font-semibold text-foreground">
                                {isParsing ? "Reading file..." : "Click or drag file to upload"}
                            </p>
                            <p className="mt-2 text-[14px] text-muted-foreground">
                                Support .csv, .xlsx, .xls (max 10MB)
                            </p>
                            <div className="mt-8 flex items-center justify-center gap-4">
                                <div className="flex items-center gap-2 rounded-xl bg-[#f0f2f4] px-4 py-1.5 text-[12px] font-bold text-muted-foreground dark:bg-white/5">
                                    <FileType className="size-4" />
                                    CSV
                                </div>
                                <div className="flex items-center gap-2 rounded-xl bg-[#f0f2f4] px-4 py-1.5 text-[12px] font-bold text-muted-foreground dark:bg-white/5">
                                    <Table className="size-4" />
                                    EXCEL
                                </div>
                            </div>
                        </div>
                    )}

                    {step === "mapping" && (
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
                                <p className="text-[14px] font-medium text-muted-foreground mb-4 flex items-center gap-2">
                                    <Check className="size-4 text-[#006c49] dark:text-[#6ffbbe]" />
                                    Successfully loaded <strong>{parsedData.length}</strong> rows
                                </p>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    {productFields.map((field) => (
                                        <div key={field.key} className="space-y-2">
                                            <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </label>
                                            <select
                                                value={mapping[field.key] || ""}
                                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/5 dark:border-white/[0.12] dark:bg-[#141414] transition-all"
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
                                className="w-full py-4 rounded-2xl bg-[#003527] bg-gradient-to-br from-[#003527] to-[#064e3b] text-white font-bold text-[16px] shadow-xl shadow-[#003527]/10 hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                Preview Data
                            </button>
                        </div>
                    )}

                    {step === "preview" && (
                        <div className="space-y-6">
                            <div className="overflow-hidden rounded-2xl border border-[#eef0f2] dark:border-white/[0.08] shadow-sm">
                                <div className="max-h-[340px] overflow-y-auto">
                                    <table className="w-full text-left text-[13px]">
                                        <thead className="sticky top-0 bg-[#fafafa] dark:bg-[#1a1a1a] border-b border-[#f0f2f4] dark:border-white/[0.06] z-10">
                                            <tr>
                                                {productFields.map(field => mapping[field.key] && (
                                                    <th key={field.key} className="px-4 py-3 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
                                                        {field.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.06]">
                                            {parsedData.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors">
                                                    {productFields.map(field => mapping[field.key] && (
                                                        <td key={field.key} className="px-4 py-3 text-foreground truncate max-w-[180px]">
                                                            {row[mapping[field.key]]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {parsedData.length > 10 && (
                                                <tr className="bg-[#fafafa] dark:bg-white/[0.01]">
                                                    <td colSpan={productFields.filter(f => mapping[f.key]).length} className="px-4 py-4 text-center text-muted-foreground font-medium italic">
                                                        ... and {parsedData.length - 10} more items ...
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep("mapping")}
                                    className="flex-1 rounded-2xl border border-[#e5e7eb] py-4 text-[15px] font-bold transition-all hover:bg-[#f4f5f7] dark:border-white/[0.12] dark:hover:bg-white/5 active:scale-[0.98]"
                                >
                                    Back to Mapping
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="flex-[2] py-4 rounded-2xl bg-[#003527] bg-gradient-to-br from-[#003527] to-[#064e3b] text-white font-bold text-[16px] shadow-xl shadow-[#003527]/10 hover:brightness-110 active:scale-[0.98] transition-all"
                                >
                                    Start Bulk Import
                                </button>
                            </div>
                        </div>
                    )}

                    {(step === "importing" || step === "success") && (
                        <div className="py-10 text-center flex flex-col items-center">
                            {step === "success" ? (
                                <div className="mb-8 relative">
                                    <div className="absolute inset-0 bg-[#006c49]/10 rounded-full blur-2xl animate-pulse" />
                                    <div className="relative size-20 rounded-3xl bg-[#006c49]/10 text-[#006c49] flex items-center justify-center animate-in zoom-in duration-500">
                                        <CheckCircle2 className="size-10" />
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-8 relative">
                                    <div className="absolute inset-0 bg-[#003527]/5 rounded-full blur-2xl animate-pulse" />
                                    <div className="relative size-20 rounded-3xl bg-[#003527]/5 text-[#003527] dark:bg-white/5 dark:text-white flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-sm">
                                        <DownloadCloud className="size-10 animate-bounce" />
                                    </div>
                                </div>
                            )}

                            <h3 className="text-2xl font-bold tracking-tight mb-2">
                                {step === "success" ? "Import Complete!" : "Importing Products"}
                            </h3>
                            <p className="text-muted-foreground font-medium mb-10">
                                {step === "success" 
                                    ? `Successfully added ${totalRows} items to your catalog.` 
                                    : `Adding ${totalRows} items. Keep this window open...`
                                }
                            </p>

                            <div className="w-full max-w-sm space-y-4">
                                <div className="relative h-4 w-full bg-[#f0f2f4] dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#003527] to-[#006c49] dark:from-[#006c49] dark:to-[#6ffbbe] rounded-full transition-all duration-300 ease-out shadow-lg"
                                        style={{ width: `${visualProgress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[13px] font-bold text-muted-foreground px-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="tabular-nums text-foreground">{processedRows}</span>
                                        <span>/</span>
                                        <span>{totalRows}</span>
                                    </span>
                                    <span className="px-2 py-0.5 bg-muted rounded-lg text-[11px] tabular-nums font-mono">
                                        {visualProgress}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
