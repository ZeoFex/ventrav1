"use client";

import Quagga, { QuaggaJSResultObject } from "@ericblade/quagga2";
import { Zap, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PosBarcodeCameraProps = {
  active: boolean;
  onScan: (decodedText: string) => void;
  className?: string;
};

/**
 * High-Performance Barcode Scanner using Quagga2.
 * Specialized for 1D barcodes with long-distance and blur handling.
 */
export function PosBarcodeCamera({
  active,
  onScan,
  className,
}: PosBarcodeCameraProps) {
  const onScanRef = useRef(onScan);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomValue, setZoomValue] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  
  onScanRef.current = onScan;

  const getCameraTrack = useCallback(() => {
    try {
      return Quagga.CameraAccess.getActiveTrack();
    } catch {
      return null;
    }
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = getCameraTrack();
    if (!track) return;
    try {
      const newState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: newState } as any]
      });
      setTorchOn(newState);
    } catch (err) {
      console.error("Failed to toggle torch:", err);
    }
  }, [torchOn, getCameraTrack]);

  const changeZoom = useCallback(async (delta: number) => {
    const track = getCameraTrack();
    if (!track) return;
    try {
      const nextZoom = Math.max(zoomRange.min, Math.min(zoomRange.max, zoomValue + delta));
      await track.applyConstraints({
        advanced: [{ zoom: nextZoom } as any]
      });
      setZoomValue(nextZoom);
    } catch (err) {
      console.error("Failed to change zoom:", err);
    }
  }, [zoomRange, zoomValue, getCameraTrack]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const handleDetected = (result: QuaggaJSResultObject) => {
      const code = result.codeResult.code;
      if (!code) return;
      
      const now = Date.now();
      const prev = lastRef.current;
      if (prev && prev.text === code && now - prev.at < 800) {
        return;
      }
      lastRef.current = { text: code, at: now };
      onScanRef.current(code);
    };

    const startScanner = () => {
      if (!containerRef.current) return;
      
      Quagga.init({
        inputStream: {
          type: "LiveStream",
          target: containerRef.current,
          constraints: {
            width: { min: 640, ideal: 1920 },
            height: { min: 480, ideal: 1080 },
            facingMode: "environment",
            aspectRatio: { ideal: 1.7777777778 }
          },
          area: { top: "30%", right: "0%", left: "0%", bottom: "30%" } // Focused Scan Area
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "upc_reader",
            "upc_e_reader"
          ],
          multiple: false
        },
        locate: true,
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 10
      }, (err) => {
        if (err) {
          console.error("Quagga initialization failed:", err);
          toast.error("Camera access denied or unsupported. Please check permissions or ensure you are on a secure connection (HTTPS).");
          return;
        }

        if (cancelled) {
          Quagga.stop();
          return;
        }

        Quagga.start();
        Quagga.onDetected(handleDetected);

        // Check Hardware Capabilities
        setTimeout(() => {
            const track = getCameraTrack();
            if (track) {
                const caps = track.getCapabilities() as any;
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
            }
        }, 800);
      });
    };

    startScanner();

    return () => {
      cancelled = true;
      Quagga.offDetected(handleDetected);
      Quagga.stop();
    };
  }, [active, getCameraTrack]);

  if (!active) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={containerRef}
        className="h-full w-full bg-black [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        aria-hidden={false}
      />
      
      {/* Visual Overlay - Unified with Quagga's area */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4">
        <div className="relative h-[40%] w-full max-h-[220px] max-w-[440px]">
          {/* Scanning Corners */}
          <div className="absolute top-0 left-0 h-8 w-8 border-t-[3px] border-l-[3px] border-[#00ff9d] rounded-tl-2xl drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
          <div className="absolute top-0 right-0 h-8 w-8 border-t-[3px] border-r-[3px] border-[#00ff9d] rounded-tr-2xl drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
          <div className="absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] border-[#00ff9d] rounded-bl-2xl drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
          <div className="absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] border-[#00ff9d] rounded-br-2xl drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" />
          
          {/* Interactive Laser Guide */}
          <div className="absolute inset-x-4 top-1/2 h-[1px] -translate-y-1/2 bg-gradient-to-r from-transparent via-[#00ff9d] to-transparent opacity-60 shadow-[0_0_12px_#00ff9d] animate-pulse" />
          
          {/* Subtle Mask Overlay */}
          <div className="absolute -inset-x-[100vw] -inset-y-[100vh] border-[100vw] border-[100vh] border-black/30" />
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
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-tighter text-center">Zoom</span>
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
