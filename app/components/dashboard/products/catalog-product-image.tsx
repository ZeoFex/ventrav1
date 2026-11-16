"use client";

import { useState } from "react";

/**
 * Product photos come from arbitrary HTTPS URLs (UPC lookup, imports,
 * retailer CDNs, Uploadthing). A native img avoids listing every host in
 * `next.config.ts`. The pulse stays up until the file has actually decoded.
 */
export function CatalogProductImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  return (
    <span className="relative block h-full w-full overflow-hidden">
      {phase !== "ready" ? (
        <span
          aria-hidden
          className="absolute inset-0 animate-pulse bg-[#efeae0] dark:bg-white/10"
        />
      ) : null}
      {phase !== "error" ? (
        <img
          src={src}
          alt={alt}
          className={`${className ?? ""} transition-opacity duration-300 ${
            phase === "ready" ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          referrerPolicy="no-referrer"
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setPhase("ready");
          }}
          onLoad={() => setPhase("ready")}
          onError={() => setPhase("error")}
        />
      ) : null}
    </span>
  );
}
