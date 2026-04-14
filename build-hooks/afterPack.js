/**
 * afterPack hook for electron-builder
 *
 * pnpm uses a symlink-based virtual store (.pnpm/) for node_modules.
 * These symlinks break when the app is packaged because the targets
 * no longer resolve correctly. This hook flattens the pnpm structure
 * into a standard flat node_modules layout that works everywhere.
 */
exports.default = async function (context) {
  const fs = require("fs");
  const path = require("path");

  const dest = path.join(
    context.appOutDir,
    "resources",
    "app",
    ".next",
    "standalone",
    "node_modules"
  );
  const src = path.join(
    context.packager.projectDir,
    ".next",
    "standalone",
    "node_modules"
  );

  if (!fs.existsSync(src)) {
    console.log("[afterPack] No standalone node_modules found - skipping");
    return;
  }

  // Remove the existing symlink-based copy that extraResources created
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(dest, { recursive: true });

  console.log("[afterPack] Flattening pnpm node_modules...");

  /**
   * Copy a package from src to dest, creating scope dirs if needed.
   * Uses dereference: true to follow symlinks and copy actual files.
   */
  function copyPackage(pkgName, pkgSrcDir) {
    const pkgDest = path.join(dest, pkgName);
    if (fs.existsSync(pkgDest)) return; // already copied
    fs.mkdirSync(path.dirname(pkgDest), { recursive: true });
    fs.cpSync(pkgSrcDir, pkgDest, { recursive: true, dereference: true });
  }

  /**
   * Walk a node_modules-style directory and copy every package found.
   */
  function copyAllPackagesFrom(nmDir) {
    if (!fs.existsSync(nmDir)) return;
    for (const entry of fs.readdirSync(nmDir)) {
      if (entry === ".pnpm" || entry === ".bin" || entry === ".package-lock.json") continue;
      const entryPath = path.join(nmDir, entry);

      if (entry.startsWith("@")) {
        // Scoped package — iterate one level deeper
        if (!fs.statSync(entryPath).isDirectory()) continue;
        for (const scopedPkg of fs.readdirSync(entryPath)) {
          const scopedSrc = path.join(entryPath, scopedPkg);
          if (fs.statSync(scopedSrc).isDirectory()) {
            copyPackage(`${entry}/${scopedPkg}`, scopedSrc);
          }
        }
      } else {
        if (fs.statSync(entryPath).isDirectory()) {
          copyPackage(entry, entryPath);
        }
      }
    }
  }

  // 1) Copy top-level packages (next, react, react-dom, etc.)
  //    These are symlinks to .pnpm/<pkg>/node_modules/<pkg>/
  copyAllPackagesFrom(src);

  // 2) Copy hoisted packages from .pnpm/node_modules/
  //    This contains deps like @swc/helpers, sharp, styled-jsx, etc.
  const pnpmHoisted = path.join(src, ".pnpm", "node_modules");
  copyAllPackagesFrom(pnpmHoisted);

  // 3) Walk each .pnpm/<version-dir>/node_modules/ for any remaining deps
  const pnpmStore = path.join(src, ".pnpm");
  if (fs.existsSync(pnpmStore)) {
    for (const storeEntry of fs.readdirSync(pnpmStore)) {
      if (storeEntry === "node_modules") continue;
      const storeNm = path.join(pnpmStore, storeEntry, "node_modules");
      copyAllPackagesFrom(storeNm);
    }
  }

  // Count what we copied
  let count = 0;
  for (const entry of fs.readdirSync(dest)) {
    if (entry.startsWith("@")) {
      count += fs.readdirSync(path.join(dest, entry)).length;
    } else {
      count++;
    }
  }

  console.log(`[afterPack] Flattened ${count} packages into standalone node_modules!`);

  // Ship production env with the installer (CI generates .env.local from secrets before building).
  // End users do not configure this — only your release pipeline needs the file at build time.
  const desktopEnvSrc = path.join(context.packager.projectDir, ".env.local");
  const desktopEnvDest = path.join(
    context.appOutDir,
    "resources",
    "app",
    ".env.local"
  );
  if (fs.existsSync(desktopEnvSrc)) {
    fs.mkdirSync(path.dirname(desktopEnvDest), { recursive: true });
    fs.copyFileSync(desktopEnvSrc, desktopEnvDest);
    console.log("[afterPack] Copied .env.local into the app bundle (release desktop config).");
  } else {
    console.warn(
      "[afterPack] No .env.local at project root — release builds for download should generate it in CI before electron:build."
    );
  }
};
