import JsBarcode from "jsbarcode";

export type Code128RenderOptions = {
  width?: number;
  height?: number;
  fontSize?: number;
  /** Force black bars — required for reliable printing (dark mode uses white text otherwise). */
  lineColor?: string;
};

/** Synchronously render Code 128 into an SVG element (safe to call before print). */
export function renderCode128Barcode(
  svg: SVGSVGElement,
  sku: string,
  options: Code128RenderOptions = {},
): boolean {
  const code = sku.trim();
  svg.innerHTML = "";
  if (!code) return false;

  const {
    width = 1.5,
    height = 40,
    fontSize = 10,
    lineColor = "#000000",
  } = options;

  try {
    JsBarcode(svg, code, {
      format: "CODE128",
      width,
      height,
      displayValue: true,
      fontSize,
      margin: 6,
      background: "transparent",
      lineColor,
      fontOptions: "bold",
      textMargin: 2,
    });

    // Tag rects so print CSS keeps bars black and any backdrop white.
    svg.querySelectorAll("rect").forEach((rect) => {
      const fill = (rect.getAttribute("fill") || "").toLowerCase();
      const isBackground =
        fill === "#ffffff" ||
        fill === "#fff" ||
        fill === "white" ||
        fill === "transparent" ||
        fill === "none";
      if (isBackground) {
        rect.classList.add("barcode-bg");
      } else {
        rect.setAttribute("fill", lineColor);
        rect.classList.add("barcode-bar");
      }
    });

    svg.classList.add("barcode-svg");
    return true;
  } catch {
    return false;
  }
}

/** Wait until barcode SVGs have non-empty content (JsBarcode runs after mount). */
export function waitForBarcodeRender(
  container: HTMLElement | null,
  timeoutMs = 800,
): Promise<void> {
  if (!container) return Promise.resolve();

  return new Promise((resolve) => {
    const started = performance.now();

    const check = () => {
      const svgs = container.querySelectorAll("svg");
      const ready =
        svgs.length > 0 &&
        Array.from(svgs).every((svg) => svg.querySelector("rect, path, g"));

      if (ready || performance.now() - started > timeoutMs) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
}
