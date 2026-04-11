"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, ImageIcon, Loader2, Printer, RefreshCw, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { PosBarcodeCamera } from "../pos/sale/pos-barcode-camera";
import { ProductBarcodePreview } from "./product-barcode-preview";
import { generateProductSku } from "./product-catalog-codes";
import { ProductsPageShell } from "./products-page-shell";
import { BarcodeGridModal } from "./barcode-grid-modal";
import { useCategories, useTags } from "./products-data-hooks";
import { useUploadThing } from "@/app/lib/uploadthing";

export type ProductFormInitialValues = {
  name: string;
  sku: string;
  description: string;
  price: number | "";
  stock: number;
  reorderAt: number | "";
  categoryId: string;
  tagIds: string[];
  status: string;
  imageSrc: string | null;
  variations: any[];
};

import { useSession } from "@/app/components/auth/use-session";
import { Plus, Trash2 } from "lucide-react";

type ProductFormProps = {
  mode: "new" | "edit";
  productId: string;
  initial: ProductFormInitialValues;
  title: string;
  shellDescription: string;
};

export function ProductForm({
  mode,
  productId,
  initial,
  title,
  shellDescription,
}: ProductFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(initial.name);
  const [sku, setSku] = useState(initial.sku);
  const [description, setDescription] = useState(initial.description);
  const [price, setPrice] = useState<number | "">(initial.price);
  const [stock, setStock] = useState(initial.stock);
  const [reorderAt, setReorderAt] = useState<number | "">(initial.reorderAt);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [status, setStatus] = useState<string>(initial.status);
  const [variations, setVariations] = useState<any[]>(initial.variations || []);
  const [isScanningMode, setIsScanningMode] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const { user } = useSession();

  const suggestedTypes = useMemo(() => {
    const bType = user?.businessType || "retail";
    if (bType === "boutique") return ["Size", "Color"];
    if (bType === "restaurant") return ["Extras", "Size", "Options"];
    if (bType === "pharmacy") return ["Dosage", "Pack Size"];
    if (bType === "electronics") return ["Storage", "Color", "Model"];
    return ["Size", "Color", "Material", "Style"];
  }, [user?.businessType]);

  const addVariation = (type: string) => {
    setVariations((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), name: "", type, priceGhs: price, stock: 0, sku: "", barcode: "" },
    ]);
  };

  const removeVariation = (id: string) => {
    setVariations((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariation = (id: string, updates: any) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    );
  };

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial.imageSrc);

  const { categories = [] } = useCategories();
  const { tags = [] } = useTags();
  const { startUpload, isUploading } = useUploadThing("productImage");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
  };

  const toggleTag = (id: string) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleBarcodeScan = useCallback(async (scannedCode: string) => {
    setIsScanningMode(false);
    setSku(scannedCode);
    setIsLookingUp(true);
    
    toast.info("Looking up product details...");

    try {
      const res = await fetch(`/api/products/lookup?barcode=${scannedCode}`);
      const result = await res.json();

      if (res.ok && result.found) {
        setName(result.data.name);
        setDescription(result.data.description || "");
        if (result.data.imageUrl) {
          setImagePreview(result.data.imageUrl);
        }
        toast.success("Product details found!");
      } else {
        toast.info("Product not found in global registry. Please enter details manually.");
      }
    } catch (err) {
      toast.error("Lookup failed. Please enter details manually.");
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSaving || isUploading) return;
    setIsSaving(true);

    const productData = {
      name,
      sku,
      description,
      priceGhs: price.toString(),
      stock,
      reorderAt: Number(reorderAt) || 0,
      categoryId: categoryId === "all" ? null : categoryId,
      tagIds,
      status,
      imageSrc: imagePreview,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      variations,
    };

    try {
      if (navigator.onLine) {
        // Online: upload image + save to server
        let finalImageSrc = imagePreview;

        if (selectedFile) {
          const uploadRes = await startUpload([selectedFile]);
          if (uploadRes && uploadRes[0]) {
            finalImageSrc = uploadRes[0].url;
          }
        }

        const res = await fetch("/api/products", {
          method: mode === "new" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            ...productData, 
            id: mode === "edit" ? productId : undefined,
            imageSrc: finalImageSrc 
          }),
        });

        if (!res.ok) throw new Error("Save failed");
      } else {
        // Offline: save to IndexedDB + queue for sync
        const { addToSyncQueue, cacheProduct } = await import("@/app/lib/offline/offline-db");
        const { nanoid } = await import("nanoid");
        const offlineId = `offline-${nanoid(10)}`;

        // Cache locally so it shows in the product list
        await cacheProduct({
          id: offlineId,
          ...productData,
          priceGhs: price.toString(),
          imageSrc: imagePreview || null,
          _offline: true,
        });

        // Queue for server sync
        await addToSyncQueue({
          type: "add-product",
          payload: productData,
        });

        // Show toast
        const { toast } = await import("sonner");
        toast.info("Product saved offline", {
          description: "It'll sync automatically when you reconnect.",
        });
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch (err) {
      alert("Failed to save product. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ProductsPageShell
      title={title}
      description={shellDescription}
      actions={
        <Link
          href="/dashboard/products"
          className="btn-secondary px-4 py-2 border rounded-xl flex items-center gap-2"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-3xl border border-border bg-white p-6 dark:bg-[#111]"
      >
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Photo</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative size-32 mx-auto sm:mx-0 rounded-2xl bg-muted border overflow-hidden flex items-center justify-center dark:border-white/10 shadow-inner">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="" className="size-full object-cover" />
                  <button type="button" onClick={clearImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-lg p-1 hover:bg-black transition-colors">
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <ImageIcon className="size-8 opacity-20" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <label className="block w-full sm:w-auto px-4 py-2 rounded-xl border border-dashed border-border hover:border-[#006c49] hover:bg-muted/50 transition-all cursor-pointer text-[14px] font-medium text-muted-foreground">
                <span className="flex items-center justify-center gap-2">
                  <ImageIcon className="size-4" />
                  Select Image
                </span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              <p className="text-[12px] text-muted-foreground mt-3">Upload a high-quality photo. Max 4MB.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t pt-8 dark:border-white/5">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Product Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 rounded-2xl border border-border bg-transparent text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 transition-all dark:border-white/10" placeholder="e.g. Coca Cola 500ml" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Barcode / SKU *</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input required value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} className="flex-1 w-full p-3 rounded-2xl border border-border bg-transparent font-mono text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 transition-all dark:border-white/10" placeholder="Scan or type..." />
                <div className="flex gap-2 h-[50px] sm:h-auto">
                  <button type="button" onClick={() => setIsScanningMode(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 bg-[#006c49]/10 text-[#006c49] font-medium border border-[#006c49]/20 rounded-2xl hover:bg-[#006c49]/20 transition-colors dark:text-[#6ffbbe] dark:bg-[#6ffbbe]/10 dark:border-[#6ffbbe]/20" title="Scan Barcode">
                    {isLookingUp ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                    <span>{isLookingUp ? "Fetching..." : "Scan"}</span>
                  </button>
                  <button type="button" onClick={() => setSku(generateProductSku())} className="flex items-center justify-center px-5 border border-border rounded-2xl hover:bg-muted transition-colors dark:border-white/10" title="Generate Random SKU"><RefreshCw className="size-4" /></button>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-2xl border border-border bg-transparent h-32 text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 transition-all dark:border-white/10" placeholder="Describe your product..." />
          </div>
        </section>

        <section className="space-y-4 border-t pt-8 dark:border-white/5">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Price (GHS) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₵</span>
                <input type="number" required step="0.01" value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full p-3 pl-8 rounded-2xl border border-border bg-transparent text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 transition-all dark:border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Stock Quantity</label>
              <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className="w-full p-3 rounded-2xl border border-border bg-transparent text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 transition-all dark:border-white/10" />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t pt-8 dark:border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold ml-1">Variations</h2>
              <p className="text-[12px] text-muted-foreground ml-1">Add sizes, colors, or extras for this product.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addVariation(t)}
                  className="px-3 py-1.5 rounded-xl border border-border text-[12px] font-medium hover:bg-muted transition-colors dark:border-white/10"
                >
                  + {t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addVariation("Other")}
                className="px-3 py-1.5 rounded-xl border border-dashed border-border text-[12px] font-medium hover:border-[#006c49] hover:text-[#006c49] transition-colors dark:border-white/10"
              >
                + Custom
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {variations.map((v) => (
              <div key={v.id} className="group flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-2xl border border-border bg-surface-elevated/20 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Type</label>
                    <input 
                      value={v.type} 
                      onChange={(e) => updateVariation(v.id, { type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-transparent text-[13px] outline-none focus:border-[#006c49]/40 transition-all dark:border-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Name / Value</label>
                    <input 
                      placeholder="e.g. Red, XL"
                      value={v.name} 
                      onChange={(e) => updateVariation(v.id, { name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-transparent text-[13px] outline-none focus:border-[#006c49]/40 transition-all dark:border-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">SKU</label>
                    <div className="flex gap-1.5 h-[38px]">
                      <input 
                        placeholder="Variant SKU"
                        value={v.sku} 
                        onChange={(e) => updateVariation(v.id, { sku: e.target.value.toUpperCase() })}
                        className="flex-1 w-full px-3 rounded-xl border border-border bg-transparent font-mono text-[12px] outline-none focus:border-[#006c49]/40 transition-all dark:border-white/10"
                      />
                      <button 
                        type="button" 
                        onClick={() => updateVariation(v.id, { sku: generateProductSku() })}
                        className="w-10 flex items-center justify-center border border-border rounded-xl hover:bg-muted transition-colors dark:border-white/10 shrink-0"
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Barcode</label>
                    <input 
                      placeholder="UPC / EAN"
                      value={v.barcode} 
                      onChange={(e) => updateVariation(v.id, { barcode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-transparent text-[13px] outline-none focus:border-[#006c49]/40 transition-all dark:border-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Price Override</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">₵</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={v.priceGhs} 
                        onChange={(e) => updateVariation(v.id, { priceGhs: e.target.value })}
                        className="w-full pl-6 pr-3 py-2 rounded-xl border border-border bg-transparent text-[13px] outline-none focus:border-[#006c49]/40 transition-all dark:border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Stock</label>
                    <input 
                      type="number"
                      value={v.stock} 
                      onChange={(e) => updateVariation(v.id, { stock: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-transparent text-[13px] outline-none focus:border-[#006c49]/40 transition-all dark:border-white/10"
                    />
                  </div>
                </div>
                <div className="flex sm:flex-col items-center justify-end sm:justify-start border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-4 mt-2 sm:mt-0 dark:border-white/5">
                  <button 
                    type="button"
                    onClick={() => removeVariation(v.id)}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 sm:p-2 sm:size-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    <Trash2 className="size-4" />
                    <span className="text-sm font-semibold sm:hidden">Remove Variant</span>
                  </button>
                </div>
              </div>
            ))}

            {variations.length === 0 && (
              <div className="py-8 border border-dashed rounded-3xl flex flex-col items-center justify-center text-center opacity-50 dark:border-white/10">
                <Plus className="size-6 mb-2" />
                <p className="text-sm font-medium">No variations added</p>
                <p className="text-[12px]">Use the suggestions above to add variants like Sizes or Colors.</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 border-t pt-8 dark:border-white/5">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full p-3 rounded-2xl border border-border bg-transparent text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 transition-all dark:border-white/10 appearance-none">
                <option value="all">Uncategorized</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-3 rounded-2xl border border-border bg-transparent text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 transition-all dark:border-white/10 appearance-none">
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </section>

        <div className="pt-8 border-t dark:border-white/5 flex flex-col sm:flex-row justify-end gap-3">
          <Link href="/dashboard/products" className="order-2 sm:order-1 px-6 py-3 border border-border rounded-2xl font-semibold text-center hover:bg-muted transition-colors dark:border-white/10">
            Cancel
          </Link>
          <button type="submit" disabled={isSaving || isUploading} className="order-1 sm:order-2 bg-[#003527] bg-gradient-to-br from-[#003527] to-[#064e3b] text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#003527]/10 disabled:opacity-50 active:scale-[0.98] transition-all">
            {(isSaving || isUploading) && <Loader2 className="size-4 animate-spin" />}
            {mode === "new" ? "Save Product" : "Save Changes"}
          </button>
        </div>
      </form>

      <BarcodeGridModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={[{ id: productId, name, sku, priceGhs: Number(price) || 0 }]}
      />

      {isScanningMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="font-semibold text-white">Scan Barcode</h3>
              <button
                onClick={() => setIsScanningMode(false)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="relative h-[60vh] sm:h-[500px]">
               <PosBarcodeCamera
                  active={isScanningMode}
                  onScan={handleBarcodeScan}
                  className="h-full w-full"
                />
            </div>
          </div>
        </div>
      )}
    </ProductsPageShell>
  );
}
