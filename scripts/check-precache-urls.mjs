import https from "https";

function get(url, ms = 15000) {
    return new Promise((resolve, reject) => {
        const req = https.get(
            url,
            { headers: { "User-Agent": "ventrapos-precache-check" } },
            (res) => {
                res.resume();
                resolve(res.statusCode ?? 0);
            },
        );
        req.setTimeout(ms, () => {
            req.destroy(new Error("timeout"));
        });
        req.on("error", reject);
    });
}

const swUrl = process.argv[2] ?? "https://www.ventrapos.com/sw.js";
const body = await new Promise((resolve, reject) => {
    https.get(swUrl, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
    }).on("error", reject);
});

const m = body.match(/precacheAndRoute\((\[[\s\S]*?\])\s*,\s*\{/);
if (!m) {
    console.error("Could not find precacheAndRoute array in sw.js");
    process.exit(1);
}

let entries;
try {
    entries = Function(`"use strict"; return (${m[1]});`)();
} catch (e) {
    console.error("Parse error:", e);
    process.exit(1);
}

const origin = new URL(swUrl).origin;
const bad = [];
const batchSize = 25;

for (let i = 0; i < entries.length; i += batchSize) {
    const slice = entries.slice(i, i + batchSize);
    const results = await Promise.all(
        slice.map(async (e) => {
            const path = typeof e === "string" ? e : e.url;
            const url = path.startsWith("http") ? path : origin + path;
            try {
                const st = await get(url);
                return st !== 200 ? { url, st } : null;
            } catch (err) {
                return { url, st: String(err) };
            }
        }),
    );
    for (const r of results) {
        if (r) bad.push(r);
    }
}

console.log("entries", entries.length, "failures", bad.length);
if (bad.length) {
    console.log(bad.slice(0, 50));
    process.exit(1);
}
