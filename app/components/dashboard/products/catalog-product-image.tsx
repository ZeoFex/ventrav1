/**
 * Renders product/catalog photos from arbitrary HTTPS URLs (UPC lookup, imports,
 * retailer CDNs, Uploadthing, etc.). Using `next/image` for these would require
 * listing every possible hostname in `next.config.ts`; a native img avoids that.
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
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
