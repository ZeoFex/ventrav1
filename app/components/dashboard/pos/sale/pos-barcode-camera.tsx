import { Zap, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type PosBarcodeCameraProps = {
  active: boolean;
  onScan: (decodedText: string) => void;
  className?: string;
};

/**
 * Camera scanner optimised for printed Code 128 barcodes.
 * High FPS, narrow format list, wide rectangular scan region.
 */
export function PosBarcodeCamera({
  active,
  onScan,
  className,
}: PosBarcodeCameraProps) {
  const reactId = useId();
  const containerId = `pos-bc-${reactId.replace(/:/g, "")}`;
  const onScanRef = useRef(onScan);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomValue, setZoomValue] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  onScanRef.current = onScan;

  const toggleTorch = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const newState = !torchOn;
      await scanner.applyVideoConstraints({
        advanced: [{ torch: newState } as any]
      });
      setTorchOn(newState);
    } catch (err) {
      console.error("Failed to toggle torch:", err);
    }
  }, [torchOn]);

  const changeZoom = useCallback(async (delta: number) => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      const nextZoom = Math.max(zoomRange.min, Math.min(zoomRange.max, zoomValue + delta));
      await scanner.applyVideoConstraints({
        advanced: [{ zoom: nextZoom } as any]
      });
      setZoomValue(nextZoom);
    } catch (err) {
      console.error("Failed to change zoom:", err);
    }
  }, [zoomRange, zoomValue]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function start() {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
        "html5-qrcode",
      );
      if (cancelled) return;
      await new Promise((r) => requestAnimationFrame(r));
      if (!document.getElementById(containerId) || cancelled) return;

      const scanner = new Html5Qrcode(containerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = scanner;

      try {
        const config = {
          fps: 25,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const width = Math.min(viewfinderWidth * 0.85, 450);
            const height = Math.min(viewfinderHeight * 0.35, 200);
            return { width, height };
          },
          aspectRatio: 1.777778,
          videoConstraints: {
            width: { min: 640, ideal: 1920, max: 1920 },
            height: { min: 480, ideal: 1080, max: 1080 },
            facingMode: "environment"
          }
        };

        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            const now = Date.now();
            const prev = lastRef.current;
            if (
              prev &&
              prev.text === decodedText &&
              now - prev.at < 600
            ) {
              return;
            }
            lastRef.current = { text: decodedText, at: now };
            onScanRef.current(decodedText);
          },
          () => undefined,
        );

        // Post-start: check capabilities
        const caps = scanner.getRunningTrackCapabilities() as any;
        if (caps.torch) setTorchSupported(true);
        if (caps.zoom) {
          setZoomSupported(true);
          setZoomRange({
            min: caps.zoom.min || 1,
            max: caps.zoom.max || 1,
            step: caps.zoom.step || 0.1
          });
          setZoomValue(caps.zoom.min || 1);
        }

      } catch (err) {
        console.error("Scanner start error:", err);
      }
    }

    void start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => undefined);
      }
    };
  }, [active, containerId]);

  if (!active) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        id={containerId}
        className="h-full w-full bg-black"
        aria-hidden={false}
      />
      
      {/* High-Performance Scan Zone Overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4">
        <div className="relative h-[35%] w-full max-h-[180px] max-w-[420px]">
          {/* Scanning Corners */}
          <div className="absolute top-0 left-0 h-8 w-8 border-t-[3px] border-l-[3px] border-[#00ff9d] rounded-tl-2xl drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
          <div className="absolute top-0 right-0 h-8 w-8 border-t-[3px] border-r-[3px] border-[#00ff9d] rounded-tr-2xl drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
          <div className="absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] border-[#00ff9d] rounded-bl-2xl drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
          <div className="absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] border-[#00ff9d] rounded-br-2xl drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
          
          {/* Interactive Laser Guide */}
          <div className="absolute inset-x-4 top-1/2 h-[1px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#00ff9d] to-transparent opacity-60 shadow-[0_0_12px_#00ff9d] animate-pulse" />
          
          {/* Subtle Mask Overlay */}
          <div className="absolute -inset-x-[100vw] -inset-y-[100vh] border-[100vw] border-[100vh] border-black/25" />
        </div>
      </div>

      {/* Advanced Camera Controls */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-black/40 p-2 backdrop-blur-md border border-white/10 sm:bottom-8">
        {torchSupported && (
          <button
            type="button"
            onClick={toggleTorch}
            className={`flex size-11 items-center justify-center rounded-full transition-all active:scale-90 ${
              torchOn 
                ? "bg-[#00ff9d] text-black shadow-[0_0_15px_#00ff9d]" 
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Zap className={`size-5 ${torchOn ? "fill-current" : ""}`} />
          </button>
        )}

        {zoomSupported && (
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              onClick={() => changeZoom(-0.5)}
              disabled={zoomValue <= zoomRange.min}
              className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 active:scale-90"
            >
              <ZoomOut className="size-5" />
            </button>
            <div className="flex w-10 flex-col items-center">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-tighter">Zoom</span>
              <span className="text-[13px] font-mono font-bold text-white">{zoomValue.toFixed(1)}x</span>
            </div>
            <button
              type="button"
              onClick={() => changeZoom(0.5)}
              disabled={zoomValue >= zoomRange.max}
              className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 active:scale-90"
            >
              <ZoomIn className="size-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
