const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const net = require("net");

// ── Single-instance lock ───────────────────────────────────────────────
// Must run before anything else. A second launch focuses the existing
// window rather than racing to spawn another server on PORT 3456.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// ── App identity & startup switches ────────────────────────────────────
app.setAppUserModelId("com.ventrapos.desktop");
// POS workflows must not have timers slowed when minimised/backgrounded.
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

// ── Paths ──────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const ROOT = isDev
  ? path.resolve(__dirname, "..")
  : path.join(process.resourcesPath, "app");

const STANDALONE = path.join(ROOT, ".next", "standalone");
const PORT = 3456; // Use a different port to avoid clashing with dev server

const ICON_PATH = path.join(__dirname, "build", "icon.ico");
const SPLASH_HTML = path.join(__dirname, "splash.html");

// ── Env vars for standalone server ─────────────────────────────────────
function parseDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function loadEnv() {
  if (isDev) {
    return;
  }

  try {
    // Production values baked in at build time (CI writes .env.local before packaging).
    // Normal users never edit this.
    parseDotEnvFile(path.join(ROOT, ".env.local"));
    // Optional override for IT / debugging only (same keys as .env.local).
    parseDotEnvFile(path.join(app.getPath("userData"), ".env.local"));
  } catch {
    /* env may be set entirely by the OS or parent process */
  }
}

// ── Logging ────────────────────────────────────────────────────────────
// A single append-mode stream is massively cheaper than fs.writeFileSync
// per log line — sync writes hurt cold-start latency on Windows.
let logStream = null;
function getLogStream() {
  if (logStream || isDev) return logStream;
  try {
    const logPath = path.join(app.getPath("userData"), "app-debug.log");
    logStream = fs.createWriteStream(logPath, { flags: "a" });
  } catch {
    logStream = null;
  }
  return logStream;
}

function debugLog(msg) {
  console.log(msg);
  const stream = getLogStream();
  if (stream) stream.write(msg + "\n");
}

// ── Server management ──────────────────────────────────────────────────
let serverProcess = null;

function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // In dev, assume `pnpm dev` is already running on port 3000
      resolve(3000);
      return;
    }

    const serverEntry = path.join(STANDALONE, "server.js");
    const env = {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "localhost",
      NODE_ENV: "production",
      ELECTRON_RUN_AS_NODE: "1",
    };

    debugLog("--- RUN INFO ---");
    const bundledEnv = path.join(ROOT, ".env.local");
    const userEnv = path.join(app.getPath("userData"), ".env.local");
    debugLog(`[debug] Bundled env (release): ${bundledEnv} exists=${fs.existsSync(bundledEnv)}`);
    debugLog(`[debug] User override (optional): ${userEnv} exists=${fs.existsSync(userEnv)}`);
    debugLog(`[debug] Server entry: ${serverEntry}`);
    debugLog(`[debug] Exists server? ${fs.existsSync(serverEntry)}`);

    serverProcess = spawn(process.execPath, [serverEntry], {
      cwd: STANDALONE,
      env,
      stdio: "pipe",
      // Suppresses a transient cmd.exe window flash on Windows.
      windowsHide: true,
    });

    let settled = false;
    const settleResolve = (port) => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      resolve(port);
    };
    const settleReject = (err) => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      reject(err);
    };

    serverProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      debugLog("[next] " + msg);
      if (msg.includes("Ready") || msg.includes("started") || msg.includes("localhost")) {
        settleResolve(PORT);
      }
    });

    serverProcess.stderr.on("data", (data) => {
      debugLog("[next:err] " + data.toString());
    });

    serverProcess.on("error", (err) => {
      debugLog(`[next:spawn-error] ${err.message}`);
      settleReject(err);
    });

    serverProcess.on("exit", (code) => {
      debugLog(`[next] server exited with code ${code}`);
      if (code !== 0 && code !== null) {
        settleReject(new Error(`Server exited with code ${code}`));
      }
    });

    // Fallback: poll the port. 100ms keeps the median attach delay tight.
    const interval = setInterval(() => {
      const sock = new net.Socket();
      sock
        .connect(PORT, "localhost", () => {
          sock.destroy();
          settleResolve(PORT);
        })
        .on("error", () => sock.destroy());
    }, 100);
  });
}

// ── Splash window ──────────────────────────────────────────────────────
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 440,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: "#00000000",
    icon: ICON_PATH,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  splashWindow.removeMenu();
  splashWindow.loadFile(SPLASH_HTML).catch((err) => {
    debugLog(`[splash] loadFile failed: ${err.message}`);
  });

  splashWindow.once("ready-to-show", () => {
    splashWindow?.show();
    setSplashStatus(`Version ${app.getVersion()}`, "__splashVersion");
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function setSplashStatus(text, fn = "__splashStatus") {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const safe = String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  splashWindow.webContents
    .executeJavaScript(`window.${fn} && window.${fn}("${safe}");`, true)
    .catch(() => {
      /* splash may be closing — fine */
    });
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

// ── Custom Menu ────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: "VentraPOS",
      submenu: [
        {
          label: "About VentraPOS",
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About VentraPOS",
              message: "VentraPOS",
              detail: `Version ${app.getVersion()}\n\nRun your store from one place.\nCloud POS for supermarkets, pharmacies, restaurants, and growing retailers.\n\n© ${new Date().getFullYear()} VentraPOS`,
              icon: ICON_PATH,
            });
          },
        },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => mainWindow?.webContents.loadURL(mainWindow.webContents.getURL().replace(/\/[^/]*$/, "/settings")),
        },
        { type: "separator" },
        { label: "Quit VentraPOS", accelerator: "CmdOrCtrl+Q", role: "quit" },
      ],
    },
    {
      label: "Navigate",
      submenu: [
        {
          label: "Dashboard",
          accelerator: "CmdOrCtrl+1",
          click: () => navigateTo("/dashboard"),
        },
        {
          label: "Point of Sale",
          accelerator: "CmdOrCtrl+2",
          click: () => navigateTo("/dashboard/pos"),
        },
        {
          label: "Products",
          accelerator: "CmdOrCtrl+3",
          click: () => navigateTo("/dashboard/products"),
        },
        {
          label: "Sales",
          accelerator: "CmdOrCtrl+4",
          click: () => navigateTo("/dashboard/sales"),
        },
        {
          label: "Customers",
          accelerator: "CmdOrCtrl+5",
          click: () => navigateTo("/dashboard/customers"),
        },
        {
          label: "Staff",
          accelerator: "CmdOrCtrl+6",
          click: () => navigateTo("/dashboard/staff"),
        },
        { type: "separator" },
        {
          label: "Back",
          accelerator: "Alt+Left",
          click: () => mainWindow?.webContents.goBack(),
        },
        {
          label: "Forward",
          accelerator: "Alt+Right",
          click: () => mainWindow?.webContents.goForward(),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.webContents.reload(),
        },
        { type: "separator" },
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+=",
          role: "zoomIn",
        },
        {
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          role: "zoomOut",
        },
        {
          label: "Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          role: "resetZoom",
        },
        { type: "separator" },
        {
          label: "Toggle Full Screen",
          accelerator: "F11",
          click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()),
        },
        { type: "separator" },
        {
          label: "Developer Tools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => mainWindow?.webContents.toggleDevTools(),
          visible: isDev,
        },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        {
          label: "Maximize",
          click: () => {
            if (mainWindow?.isMaximized()) {
              mainWindow.unmaximize();
            } else {
              mainWindow?.maximize();
            }
          },
        },
        { role: "close" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "VentraPOS Website",
          click: () => shell.openExternal("https://ventrapos.com"),
        },
        {
          label: "Contact Support",
          click: () => shell.openExternal("https://ventrapos.com/contact"),
        },
        {
          label: "Pricing & Plans",
          click: () => shell.openExternal("https://ventrapos.com/pricing"),
        },
        { type: "separator" },
        {
          label: "About VentraPOS",
          click: () => shell.openExternal("https://ventrapos.com/about"),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

/** Navigate inside the Next.js app */
function navigateTo(route) {
  if (!mainWindow) return;
  const currentUrl = mainWindow.webContents.getURL();
  try {
    const base = new URL(currentUrl).origin;
    mainWindow.webContents.loadURL(`${base}${route}`);
  } catch {
    // fallback
  }
}

// ── Main window ────────────────────────────────────────────────────────
let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "VentraPOS",
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
    backgroundColor: "#003527",
  });

  Menu.setApplicationMenu(buildMenu());

  mainWindow.once("ready-to-show", () => {
    closeSplashWindow();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function boot() {
  loadEnv();
  createSplashWindow();
  setSplashStatus("Loading settings…");

  // Construct the heavy BrowserWindow in parallel with server startup.
  // The window renders blank until we hand it a URL, but GPU/preload/IPC
  // wiring all happen concurrently with the Next.js boot.
  createMainWindow();

  setSplashStatus("Starting local server…");

  try {
    const port = await startNextServer();
    setSplashStatus("Almost ready…");
    // Skip the landing page - go straight to dashboard.
    // The proxy middleware redirects to /login if no auth cookie exists.
    await mainWindow.loadURL(`http://localhost:${port}/dashboard`);
  } catch (err) {
    closeSplashWindow();
    const { dialog } = require("electron");
    dialog.showErrorBox(
      "Failed to Start VentraPOS",
      [
        "The app could not start. Download the latest version from ventrapos.com, or contact support if this keeps happening.",
        "",
        `Details: ${err.message}`,
      ].join("\n")
    );
    app.quit();
  }
}

// ── IPC handlers (window controls) ─────────────────────────────────────
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle("window:close", () => mainWindow?.close());

// ── App lifecycle ──────────────────────────────────────────────────────
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(boot);

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (logStream) {
    logStream.end();
    logStream = null;
  }
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    boot();
  }
});
