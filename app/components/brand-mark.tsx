import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** App icon. The file is already a squircle; the radius clips any leftover corner. */
export function BrandMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-[22%] ring-1 ring-black/10 dark:ring-white/15",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand-logo.png"
        alt=""
        width={256}
        height={256}
        className="size-full object-cover"
      />
    </span>
  );
}

export function BrandLockup({
  href = "/",
  size = 28,
  className,
  wordClassName,
  showWord = true,
  onClick,
}: {
  href?: string;
  size?: number;
  className?: string;
  wordClassName?: string;
  showWord?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("inline-flex min-w-0 items-center gap-2", className)}
    >
      <BrandMark size={size} />
      {showWord ? (
        <span
          className={cn(
            "truncate font-[family-name:var(--font-display)] font-semibold tracking-tight text-foreground",
            wordClassName,
          )}
        >
          VentraPOS
        </span>
      ) : (
        <span className="sr-only">VentraPOS</span>
      )}
    </Link>
  );
}

/** Mobile auth screens. Desktop uses the split panel lockup instead. */
export function AuthBrand({ linked = true }: { linked?: boolean }) {
  const row = (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={32} />
      <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-foreground">
        VentraPOS
      </span>
    </span>
  );

  return (
    <div className="mb-10 flex flex-col items-start lg:hidden">
      {linked ? (
        <Link href="/" className="rounded-lg">
          {row}
        </Link>
      ) : (
        row
      )}
      <div className="ml-[42px] mt-2 h-1 w-8 rounded-full bg-gradient-to-r from-[#006c49] to-[#059669]" />
    </div>
  );
}
