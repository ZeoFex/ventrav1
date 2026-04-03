"use client";

/**
 * IndexedDB wrapper for offline data storage.
 * Stores: products, categories, syncQueue
 */

const DB_NAME = "ventrapos-offline";
const DB_VERSION = 1;

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  priceGhs: string;
  stock: number;
  reorderAt?: number | null;
  categoryId?: string | null;
  tagIds?: string[] | null;
  imageSrc?: string | null;
  status: "active" | "archived" | "out_of_stock" | string;
  variations?: any[] | null;
  _offline?: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: "add-product" | "checkout";
  payload: any; // Keeping payload as any for now as it handles dynamic JSON objects
  createdAt: number;
  attempts: number;
}


let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

// ── Generic helpers ──

async function putAll<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  for (const item of items) {
    store.put(item);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(item);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function remove(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Products ──

export async function cacheProducts(products: Product[]): Promise<void> {
  return putAll<Product>("products", products);
}

export async function getCachedProducts(): Promise<Product[]> {
  return getAll<Product>("products");
}

export async function cacheProduct(product: Product): Promise<void> {
  return put<Product>("products", product);
}

export async function updateCachedProductStock(
  productId: string,
  soldQty: number,
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("products", "readwrite");
  const store = tx.objectStore("products");
  const req = store.get(productId);

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const product = req.result as Product;
      if (product) {
        product.stock = Math.max(0, product.stock - soldQty);
        store.put(product);
      }
      tx.oncomplete = () => resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Categories ──

export async function cacheCategories(categories: Category[]): Promise<void> {
  return putAll<Category>("categories", categories);
}

export async function getCachedCategories(): Promise<Category[]> {
  return getAll<Category>("categories");
}

// ── Sync Queue ──

export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "createdAt" | "attempts">): Promise<string> {
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: SyncQueueItem = {
    ...item,
    id,
    createdAt: Date.now(),
    attempts: 0,
  };
  await put("syncQueue", entry);
  return id;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const items = await getAll<SyncQueueItem>("syncQueue");
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  return remove("syncQueue", id);
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  return put("syncQueue", item);
}

export async function getSyncQueueCount(): Promise<number> {
  const items = await getSyncQueue();
  return items.length;
}
