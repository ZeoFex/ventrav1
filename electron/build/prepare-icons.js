/**
 * Icon preparation for the VentraPOS desktop build.
 *
 * Reads the single source of truth (public/logo.jpg) and emits every
 * derived asset the Windows desktop build needs, so we keep one logo
 * in the repo and never hand-roll multi-resolution files.
 *
 * Outputs (all written next to this script, under electron/build/):
 *   - icon.png        1024x1024  source for electron-builder (Win)
 *   - icon.ico        16/32/48/64/128/256 multi-res for taskbar/installer
 *   - splash-logo.png 512x512    used by electron/splash.html
 *
 * Run via `pnpm icons:prepare` (also chained into `pnpm electron:build`).
 */
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..", "..");
const SOURCE = path.join(ROOT, "public", "logo.jpg");
const OUT_DIR = __dirname;

const ICON_PNG = path.join(OUT_DIR, "icon.png");
const ICON_ICO = path.join(OUT_DIR, "icon.ico");
const SPLASH_PNG = path.join(OUT_DIR, "splash-logo.png");

/** Multi-resolution set baked into the Windows .ico. */
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function fitSquare(sourcePath, size, background = { r: 255, g: 255, b: 255, alpha: 1 }) {
    return sharp(sourcePath)
        .resize(size, size, {
            fit: "contain",
            background,
        })
        .png()
        .toBuffer();
}

async function main() {
    // png-to-ico v3+ is ESM-only; use dynamic import from CommonJS.
    const pngToIco = (await import("png-to-ico")).default;

    if (!fs.existsSync(SOURCE)) {
        console.error(`[icons] Source logo not found at ${SOURCE}`);
        process.exit(1);
    }

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    console.log(`[icons] Source: ${path.relative(ROOT, SOURCE)}`);

    const masterPng = await fitSquare(SOURCE, 1024);
    await fs.promises.writeFile(ICON_PNG, masterPng);
    console.log(`[icons] Wrote ${path.relative(ROOT, ICON_PNG)} (1024x1024)`);

    const splashPng = await fitSquare(SOURCE, 512);
    await fs.promises.writeFile(SPLASH_PNG, splashPng);
    console.log(`[icons] Wrote ${path.relative(ROOT, SPLASH_PNG)} (512x512)`);

    const icoBuffers = await Promise.all(ICO_SIZES.map((size) => fitSquare(SOURCE, size)));
    const icoBuffer = await pngToIco(icoBuffers);
    await fs.promises.writeFile(ICON_ICO, icoBuffer);
    console.log(`[icons] Wrote ${path.relative(ROOT, ICON_ICO)} (${ICO_SIZES.join("/")})`);

    console.log("[icons] Done.");
}

main().catch((err) => {
    console.error("[icons] Failed:", err);
    process.exit(1);
});
