"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ProductItemPhotoCaptureProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

/**
 * Still photo of an item that was not found in the barcode catalogs.
 * The picture is attached to the product being created.
 */
export function ProductItemPhotoCapture({
  open,
  onClose,
  onCapture,
}: ProductItemPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setReady(false);

    const stop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("This device has no camera. Upload a photo instead.");
        onCloseRef.current();
        return;
      }

      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        { video: true, audio: false },
      ];

      let stream: MediaStream | null = null;
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch {
          stream = null;
        }
      }

      if (cancelled) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      if (!stream) {
        toast.error("Camera unavailable. Upload a photo instead.");
        onCloseRef.current();
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      if (!cancelled) setReady(true);
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth || capturing) return;
    setCapturing(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      toast.error("Could not take the photo. Try again.");
      return;
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) {
          toast.error("Could not take the photo. Try again.");
          return;
        }
        onCapture(new File([blob], `item-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-black sm:h-[min(88dvh,720px)] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between px-4 py-3">
          <div>
            <h3 className="text-[15px] font-semibold text-white">Photograph the item</h3>
            <p className="text-[12px] text-white/70">
              This barcode is not in the catalog. The photo is saved with the product.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close camera"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="h-full w-full object-cover"
            aria-label="Item camera preview"
          />
          {!ready ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/80">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-[14px] font-medium text-white/80 hover:text-white"
          >
            Skip photo
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!ready || capturing}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-black disabled:opacity-50"
          >
            {capturing ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            Use this photo
          </button>
        </div>
      </div>
    </div>
  );
}
