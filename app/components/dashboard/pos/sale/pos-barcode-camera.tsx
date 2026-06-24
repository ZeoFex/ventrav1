"use client";

import { Zap, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarcodeScanEngine,
  drawDetectionOverlay,
} from "@/app/lib/pos/barcode-scanner/engine";
import type { DetectedBarcode } from "@/app/lib/pos/barcode-scanner/types";
import { POS_BARCODE_SCANNER_CONFIG } from "@/app/lib/pos/barcode-scanner/config";

export type PosBarcodeScanResult = {
  text: string;
  format?: string;
  confidence?: number;
};

type PosBarcodeCameraProps = {
  active: boolean;
  /** When false, camera stays on but decode/accept is paused (during lookup). */
  scanEnabled?: boolean;
  onScan: (decodedText: string, meta?: PosBarcodeScanResult) => void;
  className?: string;
};

type CameraConstraintSet = MediaTrackConstraintSet & {
  torch?: boolean;
  zoom?: number;
  focusMode?: string;
};

/**
 * Intelligent full-frame barcode camera.
 *
 * Uses the Shape Detection BarcodeDetector API when available (orientation +
 * perspective tolerant), with a ZXing polyfill + multi-rotation fallback.
 * Replaces the previous Quagga2 scan-line approach.
 */
export function PosBarcodeCamera({
  active,
  scanEnabled = true,
  onScan,
  className,
}: PosBarcodeCameraProps) {
  const onScanRef = useRef(onScan);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<BarcodeScanEngine | null>(null);
  const overlayRafRef = useRef(0);

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomValue, setZoomValue] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  const [backendLabel, setBackendLabel] = useState<string | null>(null);
  const latestDetectionRef = useRef<DetectedBarcode | null>(null);

  onScanRef.current = onScan;

  const getCameraTrack = useCallback(() => {
    return streamRef.current?.getVideoTracks()[0] ?? null;
  }, []);

  const syncOverlaySize = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;

    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  const paintOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawDetectionOverlay(ctx, latestDetectionRef.current, video, canvas);
  }, []);

  const startOverlayLoop = useCallback(() => {
    const loop = () => {
      paintOverlay();
      overlayRafRef.current = requestAnimationFrame(loop);
    };
    overlayRafRef.current = requestAnimationFrame(loop);
  }, [paintOverlay]);

  const stopOverlayLoop = useCallback(() => {
    if (overlayRafRef.current) {
      cancelAnimationFrame(overlayRafRef.current);
      overlayRafRef.current = 0;
    }
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    latestDetectionRef.current = null;
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = getCameraTrack();
    if (!track) return;
    try {
      const newState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: newState } as CameraConstraintSet],
      });
      setTorchOn(newState);
    } catch (err) {
      console.error("Failed to toggle torch:", err);
    }
  }, [torchOn, getCameraTrack]);

  const changeZoom = useCallback(
    async (delta: number) => {
      const track = getCameraTrack();
      if (!track) return;
      try {
        const nextZoom = Math.max(
          zoomRange.min,
          Math.min(zoomRange.max, zoomValue + delta),
        );
        await track.applyConstraints({
          advanced: [{ zoom: nextZoom } as CameraConstraintSet],
        });
        setZoomValue(nextZoom);
      } catch (err) {
        console.error("Failed to change zoom:", err);
      }
    },
    [zoomRange, zoomValue, getCameraTrack],
  );

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    const startCamera = async () => {
      try {
        const { camera } = POS_BARCODE_SCANNER_CONFIG;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: camera.facingMode,
            width: camera.width,
            height: camera.height,
            // Continuous autofocus for nearby products (Chrome/Android)
            focusMode: { ideal: camera.focusMode },
          } as MediaTrackConstraints,
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        syncOverlaySize();
        startOverlayLoop();

        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = track.getCapabilities() as MediaTrackCapabilities & {
            torch?: boolean;
            zoom?: { min?: number; max?: number; step?: number } | number;
            focusMode?: string[];
          };

          if (caps.torch) setTorchSupported(true);

          if (caps.focusMode?.includes("continuous")) {
            try {
              await track.applyConstraints({
                advanced: [{ focusMode: "continuous" } as CameraConstraintSet],
              });
            } catch {
              /* optional */
            }
          }

          if (caps.zoom) {
            const zoomCapabilities =
              typeof caps.zoom === "number"
                ? { min: caps.zoom, max: caps.zoom, step: 0.1 }
                : caps.zoom;

            setZoomSupported(true);
            setZoomRange({
              min: zoomCapabilities.min || 1,
              max: zoomCapabilities.max || 1,
              step: zoomCapabilities.step || 0.1,
            });
            setZoomValue(zoomCapabilities.min || 1);
          }
        }

        const engine = new BarcodeScanEngine({
          onDetection: (detection) => {
            latestDetectionRef.current = detection;
          },
          onAcceptedScan: (detection) => {
            latestDetectionRef.current = detection;
            onScanRef.current(detection.rawValue, {
              text: detection.rawValue,
              format: detection.format,
              confidence: detection.confidence,
            });
          },
          onError: (err) => {
            console.warn("[barcode-engine]", err);
          },
        });

        engineRef.current = engine;
        const backend = await engine.start(video);
        if (!cancelled) {
          setBackendLabel(backend === "native" ? "HD scan" : "Compat scan");
        }
      } catch (err) {
        console.error("Camera / scanner startup failed:", err);
        toast.error(
          "Camera access denied or unsupported. Use HTTPS and allow camera permissions.",
        );
      }
    };

    void startCamera();

    const onResize = () => syncOverlaySize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      stopOverlayLoop();
      engineRef.current?.stop();
      engineRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (video) video.srcObject = null;
      setBackendLabel(null);
      setTorchSupported(false);
      setTorchOn(false);
      setZoomSupported(false);
    };
  }, [active, startOverlayLoop, stopOverlayLoop, syncOverlaySize]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (scanEnabled) engine.resume();
    else engine.pause();
  }, [scanEnabled]);

  if (!active) return null;

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="h-full w-full object-cover bg-black"
        aria-label="Barcode camera preview"
      />

      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      />

      {/* Soft vignette — no fixed scan line; full frame is analyzed */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

      {backendLabel ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white/75 backdrop-blur-sm">
          {backendLabel}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] px-4 sm:bottom-[5rem]">
        <p className="text-center text-[12px] leading-snug text-white/80 drop-shadow-sm">
          Hold the product naturally — any angle works
        </p>
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-black/40 p-2 backdrop-blur-md sm:bottom-8">
        {torchSupported ? (
          <button
            type="button"
            onClick={toggleTorch}
            className={`flex size-11 items-center justify-center rounded-full transition-all active:scale-90 ${
              torchOn
                ? "bg-[#00ff9d] text-black shadow-[0_0_15px_#00ff9d]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            aria-label={torchOn ? "Turn torch off" : "Turn torch on"}
          >
            <Zap className={`size-5 ${torchOn ? "fill-current" : ""}`} />
          </button>
        ) : null}

        {zoomSupported ? (
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              onClick={() => changeZoom(-0.5)}
              disabled={zoomValue <= zoomRange.min}
              className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 active:scale-90"
              aria-label="Zoom out"
            >
              <ZoomOut className="size-5" />
            </button>
            <div className="flex w-10 flex-col items-center">
              <span className="text-center text-[11px] font-bold uppercase tracking-tighter text-white/50">
                Zoom
              </span>
              <span className="font-mono text-[13px] font-bold text-white">
                {zoomValue.toFixed(1)}x
              </span>
            </div>
            <button
              type="button"
              onClick={() => changeZoom(0.5)}
              disabled={zoomValue >= zoomRange.max}
              className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 active:scale-90"
              aria-label="Zoom in"
            >
              <ZoomIn className="size-5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
