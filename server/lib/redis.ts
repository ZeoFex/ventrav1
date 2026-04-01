import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "rediss://default:gQAAAAAAATvqAAIncDJmZWU4ZTk5YjA2ODA0OTdlOGZjMDUyYzc4MDc2NzQ4ZnAyODA4NzQ@diverse-guinea-80874.upstash.io:6379";

if (!redisUrl) {
    throw new Error("REDIS_URL is not defined in environment variables");
}

let redis: Redis;

try {
    // Use singleton pattern to prevent multiple connections in dev
    if (!(global as any).redis) {
        (global as any).redis = new Redis(redisUrl, {
            maxRetriesPerRequest: null, // Required by BullMQ
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
    }
    redis = (global as any).redis;
} catch (error) {
    console.error("❌ Failed to connect to Redis:", error);
    throw error;
}

export { redis };
