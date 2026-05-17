"use client";

import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  type SyncQueueItem,
} from "./offline-db";

const MAX_ATTEMPTS = 3;

let isSyncing = false;

/**
 * Process the sync queue: push all pending operations to the server.
 * Called automatically when going back online.
 */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    // Notify UI that sync started
    window.dispatchEvent(new CustomEvent("ventra:sync-start", { detail: { count: queue.length } }));

    for (const item of queue) {
      try {
        await processItem(item);
        await removeSyncQueueItem(item.id);
        synced++;
      } catch (err) {
        console.error(`[Sync] Failed to process ${item.type}:`, err);
        item.attempts++;

        if (item.attempts >= MAX_ATTEMPTS) {
          // Give up after max attempts — leave in queue for manual retry
          await updateSyncQueueItem(item);
          failed++;
        } else {
          await updateSyncQueueItem(item);
          failed++;
        }
      }
    }

    // Notify UI that sync completed
    window.dispatchEvent(
      new CustomEvent("ventra:sync-complete", { detail: { synced, failed } }),
    );

    // Trigger SWR revalidation for products
    if (synced > 0) {
      window.dispatchEvent(new CustomEvent("ventra:synced"));
    }
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

async function processItem(item: SyncQueueItem): Promise<void> {
  switch (item.type) {
    case "add-product":
      return syncAddProduct(item.payload);
    case "checkout":
      return syncCheckout(item.payload);
    case "add-customer":
      return syncAddCustomer(item.payload);
    case "update-customer":
      return syncUpdateCustomer(item.payload);
    case "add-expense":
      return syncAddExpense(item.payload);
    default:
      throw new Error(`Unknown sync type: ${item.type}`);
  }
}

async function syncAddProduct(payload: any): Promise<void> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

async function syncCheckout(payload: any): Promise<void> {
  const res = await fetch("/api/pos/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

async function syncAddCustomer(payload: any): Promise<void> {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

async function syncUpdateCustomer(payload: any): Promise<void> {
  // Using the id to PUT to specific route if needed, else to general. We'll assume general or specific API exists.
  // Actually, we've used standard API pattern /api/customers/[id]
  const customerId = payload.id;
  const res = await fetch(`/api/customers/${customerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

async function syncAddExpense(payload: any): Promise<void> {
  const res = await fetch("/api/finance/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
}

/**
 * Initialize sync listeners. Call once from dashboard layout.
 */
export function initOfflineSync(): () => void {
  const handleOnline = () => {
    // Small delay to let the connection stabilize
    setTimeout(() => {
      processSyncQueue();
    }, 1500);
  };

  window.addEventListener("online", handleOnline);

  // Also try to sync on init if we're online and have queued items
  if (navigator.onLine) {
    setTimeout(() => processSyncQueue(), 2000);
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
