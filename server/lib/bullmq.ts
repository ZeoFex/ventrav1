import { Queue, Worker, Job } from "bullmq";
import { redis } from "./redis";

/** 
 * BullMQ Setup — leverages Redis for high-speed background job processing.
 * Using IORedis connection managed in redis.ts for full protocol support.
 */

// 1. Connection Config
const connection = redis;

// 2. Define Queues
export const inventoryQueue = new Queue("inventory_tasks", { connection: connection as any });
export const emailQueue = new Queue("email_tasks", { connection: connection as any });

// 3. Worker logic (triggered by background process or server start)
//    In a serverless environment like Vercel, this won't stay active.
//    In a long-running server (Coolify, Railway, etc.), this is active.
export function startWorkers() {
    console.log("📢 Starting BullMQ workers...");

    // Worker for inventory-specific background tasks
    new Worker("inventory_tasks", async (job: Job) => {
        const { type, data } = job.data;
        console.log(`[Worker] processing job ${job.id} of type ${type}...`);

        switch (type) {
            case "stock_low_check":
                // Handle reorder logic, notifications
                console.log(`[Worker] checking low stock for product ${data.productId}`);
                break;
            case "sync_branches":
                // Push inventory updates to all branches
                console.log(`[Worker] syncing branches for biz ${data.businessId}`);
                break;
            default:
                console.warn(`[Worker] unknown task type: ${type}`);
        }
    }, { connection: connection as any });

    // Worker for email distribution (keeps UI snappy by offloading mail server latency)
    new Worker("email_tasks", async (job: Job) => {
        // offload to resend-service...
        console.log(`[Worker] sending email job ${job.id}`);
    }, { connection: connection as any });
}

/**
 * Add a task to check stock status asynchronously.
 * Offloads critical POS performance by handling non-critical logic in the background.
 */
export async function queueStockCheck(productId: string, businessId: string) {
    await inventoryQueue.add("check_stock", { type: "stock_low_check", data: { productId, businessId } });
}
