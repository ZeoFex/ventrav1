"use client";

import Image from "next/image";
import { useState } from "react";

function noteImage(node: HTMLImageElement | null, markReady: () => void) {
  if (node?.complete && node.naturalWidth > 0) markReady();
}

type ThemeImage = { type: "theme"; light: string; dark: string; alt: string };
type SingleImage = { type: "single"; src: string; alt: string };
export type SectionImage = ThemeImage | SingleImage;

export function ThemedSectionImage({
  image,
  priority = false,
  className = "object-contain p-3 sm:p-5 lg:p-6",
}: {
  image: SectionImage;
  priority?: boolean;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const markReady = () => setReady(true);

  return (
    <>
      {ready ? null : (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-[#d7ebe3] dark:bg-white/10"
        />
      )}
      {image.type === "single" ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className={`${className} z-[1]`}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority={priority}
          ref={(node) => noteImage(node, markReady)}
          onLoad={markReady}
        />
      ) : (
        <>
          <Image
            src={image.light}
            alt={image.alt}
            fill
            className={`${className} z-[1] block dark:hidden`}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={priority}
            ref={(node) => noteImage(node, markReady)}
            onLoad={markReady}
          />
          <Image
            src={image.dark}
            alt=""
            fill
            className={`${className} z-[1] hidden dark:block`}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={priority}
            ref={(node) => noteImage(node, markReady)}
            onLoad={markReady}
          />
        </>
      )}
    </>
  );
}
